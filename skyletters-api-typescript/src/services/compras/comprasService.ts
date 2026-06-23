import { comprasRepository, type DetalleInput } from "../../repositories/comprasRepository";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { partidaDoble } from "../partidaDoble/partidaDobleService";
import type { Compra } from "@prisma/client";

export interface CreateCompraInput {
  numeroFactura: number;
  idProveedor: number;
  fechaCompra: Date;
  detalleProducto: string;
  subtotal: number;
  impuesto: number;
  total: number;
  formaPago: string;
  detalles?: DetalleInput[];
}

// Subtotal de una línea: cantidad * precio aplicando el descuento (%) por línea.
// Se recalcula SIEMPRE en el servidor; nunca se confía en el subtotal enviado por el cliente.
function lineSubtotal(d: DetalleInput): number {
  return Number(d.cantidad) * Number(d.precio) * (1 - (Number(d.descuento) || 0) / 100);
}

interface TaxBreakdown {
  id: number;
  nombre: string;
  porcentaje: number;
  esRetencion: boolean;
  monto: number;
  base: "subtotal" | "iva";
}

interface ComputedTotals {
  detallesNormalizados: DetalleInput[];
  subtotal: number;
  impuestoNeto: number;
  total: number;
  impuestos: TaxBreakdown[];
}

/**
 * Recalcula en el servidor el subtotal, impuesto neto y total de la compra
 * a partir de los detalles y de los impuestos del PROVEEDOR. El IVA aquí es
 * descontable y las retenciones son las practicadas al proveedor.
 */
async function computeTotals(
  idProveedor: number,
  detalles: DetalleInput[],
): Promise<ComputedTotals> {
  // 1. Subtotal recalculado desde cantidad/precio/descuento (corrige el subtotal por línea).
  const detallesNormalizados: DetalleInput[] = detalles.map((d) => ({
    nombre: d.nombre,
    cantidad: Number(d.cantidad),
    precio: Number(d.precio),
    descuento: Number(d.descuento) || 0,
    subtotal: lineSubtotal(d),
    idProducto: d.idProducto ?? null,
  }));
  const subtotal = detallesNormalizados.reduce((acc, d) => acc + (d.subtotal ?? 0), 0);

  // 2. Impuestos aplicables del proveedor (CSV de ids -> registros de Impuesto).
  const proveedor = await prisma.proveedor.findUnique({ where: { id: idProveedor } });
  const ids = (proveedor?.impuestosAplicables ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => !Number.isNaN(n));

  const impuestos = ids.length
    ? await prisma.impuesto.findMany({ where: { id: { in: ids } } })
    : [];

  const breakdown: TaxBreakdown[] = [];

  // 3. Paso 1: impuestos que SUMAN (IVA descontable) -> acumulan el IVA total.
  let ivaTotal = 0;
  for (const i of impuestos) {
    const tipo = (i.tipo || "").toLowerCase();
    if (tipo.includes("retenc")) continue;
    const monto = Math.round((subtotal * i.porcentaje) / 100);
    ivaTotal += monto;
    breakdown.push({
      id: i.id,
      nombre: i.nombre,
      porcentaje: i.porcentaje,
      esRetencion: false,
      monto,
      base: "subtotal",
    });
  }

  // 4. Paso 2: retenciones (RESTAN). ReteIVA sobre el IVA; las demás sobre el subtotal con base mínima.
  for (const i of impuestos) {
    const tipo = (i.tipo || "").toLowerCase();
    if (!tipo.includes("retenc")) continue;
    const esReteIva = tipo.includes("iva");
    if (esReteIva) {
      const monto = Math.round((ivaTotal * i.porcentaje) / 100);
      breakdown.push({
        id: i.id,
        nombre: i.nombre,
        porcentaje: i.porcentaje,
        esRetencion: true,
        monto,
        base: "iva",
      });
    } else {
      const baseMin = Number(i.baseImponible || 0);
      const monto = subtotal >= baseMin ? Math.round((subtotal * i.porcentaje) / 100) : 0;
      breakdown.push({
        id: i.id,
        nombre: i.nombre,
        porcentaje: i.porcentaje,
        esRetencion: true,
        monto,
        base: "subtotal",
      });
    }
  }

  // 5. Impuesto neto = Σ(suman) − Σ(restan); total = subtotal + impuestoNeto.
  const impuestoNeto = breakdown.reduce(
    (acc, t) => acc + (t.esRetencion ? -t.monto : t.monto),
    0,
  );
  const total = subtotal + impuestoNeto;

  return { detallesNormalizados, subtotal, impuestoNeto, total, impuestos: breakdown };
}

export const comprasService = {
  async getAll(): Promise<Compra[]> {
    return comprasRepository.findAll();
  },

  async getById(id: number): Promise<Compra | null> {
    return comprasRepository.findById(id);
  },

  async create(input: CreateCompraInput): Promise<Compra> {
    const proveedor = await prisma.proveedor.findUnique({ where: { id: input.idProveedor } });
    if (!proveedor) throw AppError.badRequest("El proveedor indicado no existe");
    const { detalles, ...data } = input;
    const lineas = detalles ?? [];

    // Recalcular SIEMPRE en el servidor; ignorar los totales enviados por el cliente.
    const { detallesNormalizados, subtotal, impuestoNeto, total, impuestos } =
      await computeTotals(input.idProveedor, lineas);

    data.subtotal = subtotal;
    data.impuesto = impuestoNeto;
    data.total = total;
    data.detalleProducto = JSON.stringify({ items: detallesNormalizados, impuestos });

    // Estado inicial y saldo pendiente: compra nace PENDIENTE con saldo = total.
    const dataConEstado = { ...data, estado: "PENDIENTE", saldoPendiente: total };

    const compra = await comprasRepository.create(dataConEstado, detallesNormalizados);

    // Movimiento de inventario (ENTRADA) por cada línea con producto asociado.
    // Las compras SIEMPRE suman mercancía; no se valida stock.
    const lineasInventario = detallesNormalizados.filter(
      (d): d is DetalleInput & { idProducto: number } =>
        d.idProducto !== null && d.idProducto !== undefined,
    );
    for (const d of lineasInventario) {
      const producto = await prisma.producto.findUnique({ where: { id: d.idProducto } });
      if (!producto) continue;
      const nuevoStock = producto.cantidadProducto + d.cantidad;
      await prisma.producto.update({
        where: { id: d.idProducto },
        data: { cantidadProducto: nuevoStock },
      });
      await prisma.movimientoInventario.create({
        data: {
          idProducto: d.idProducto,
          tipo: "ENTRADA",
          cantidad: d.cantidad,
          saldoResultante: nuevoStock,
          motivo: `Compra N° ${compra.numeroFactura}`,
        },
      });
    }

    // Partida doble: registra el asiento contable de la compra.
    await partidaDoble.generarDesdeCompra(compra);

    return compra;
  },

  async update(id: number, input: Partial<CreateCompraInput>): Promise<Compra> {
    const c = await comprasRepository.findById(id);
    if (!c) throw AppError.notFound("Compra no encontrada");
    const { detalles, ...data } = input;

    // Solo recalcular si llegan detalles; si no, se dejan los totales tal cual.
    if (detalles) {
      const idProveedor = input.idProveedor ?? c.idProveedor;
      const { detallesNormalizados, subtotal, impuestoNeto, total, impuestos } =
        await computeTotals(idProveedor, detalles);

      data.subtotal = subtotal;
      data.impuesto = impuestoNeto;
      data.total = total;
      data.detalleProducto = JSON.stringify({ items: detallesNormalizados, impuestos });

      const actualizada = await comprasRepository.update(id, data, detallesNormalizados);
      await partidaDoble.generarDesdeCompra(actualizada);
      return actualizada;
    }

    return comprasRepository.update(id, data, undefined);
  },

  async delete(id: number): Promise<void> {
    const c = await comprasRepository.findById(id);
    if (!c) throw AppError.notFound("Compra no encontrada");
    await partidaDoble.eliminarPorOrigen("COMPRA", id);
    await comprasRepository.delete(id);
  },
};
