import { facturasRepository, type DetalleInput } from "../../repositories/facturasRepository";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { partidaDoble } from "../partidaDoble/partidaDobleService";
import type { Factura } from "@prisma/client";

export interface CreateFacturaInput {
  numeroFactura: number;
  idCliente: number;
  fechaFactura: Date;
  detalleProducto: string;
  subtotalFactura: number;
  impuestoFactura: number;
  totalFactura: number;
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
 * Recalcula en el servidor el subtotal, impuesto neto y total de la factura
 * a partir de los detalles y de los impuestos del cliente. Replica EXACTAMENTE
 * la lógica del frontend (FacturaForm) para que front y back coincidan.
 */
async function computeTotals(
  idCliente: number,
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

  // 2. Impuestos aplicables del cliente (CSV de ids -> registros de Impuesto).
  const cliente = await prisma.cliente.findUnique({ where: { id: idCliente } });
  const ids = (cliente?.impuestosAplicables ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => !Number.isNaN(n));

  const impuestos = ids.length
    ? await prisma.impuesto.findMany({ where: { id: { in: ids } } })
    : [];

  const breakdown: TaxBreakdown[] = [];

  // 3. Paso 1: impuestos que SUMAN (IVA / venta) -> acumulan el IVA total.
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

export const facturasService = {
  async getAll(): Promise<Factura[]> {
    return facturasRepository.findAll();
  },

  async getById(id: number): Promise<Factura | null> {
    return facturasRepository.findById(id);
  },

  // Siguiente número de factura consecutivo, según la resolución DIAN activa.
  async getNextNumber(): Promise<number> {
    const last = await prisma.factura.findFirst({
      orderBy: { numeroFactura: "desc" },
      select: { numeroFactura: true },
    });
    if (last) return last.numeroFactura + 1;
    // Primera factura: arranca en el número inicial de la resolución de venta activa.
    const res = await prisma.resolucionFacturacion.findFirst({
      where: { tipoDocumento: "FACTURA_VENTA", estado: true },
      orderBy: { id: "desc" },
    });
    return res?.numeroInicial ?? 1;
  },

  async create(input: CreateFacturaInput): Promise<Factura> {
    const cliente = await prisma.cliente.findUnique({ where: { id: input.idCliente } });
    if (!cliente) throw AppError.badRequest("El cliente indicado no existe");
    const { detalles, ...data } = input;
    const lineas = detalles ?? [];

    // Enforcement de resolución DIAN (si hay una resolución de venta activa).
    const resolucion = await prisma.resolucionFacturacion.findFirst({
      where: { tipoDocumento: "FACTURA_VENTA", estado: true },
      orderBy: { id: "desc" },
    });
    if (resolucion) {
      if (
        input.numeroFactura < resolucion.numeroInicial ||
        input.numeroFactura > resolucion.numeroFinal
      ) {
        throw AppError.badRequest("El número está fuera del rango autorizado por la resolución");
      }
      const fecha = new Date(input.fechaFactura);
      if (fecha < resolucion.vigenciaDesde || fecha > resolucion.vigenciaHasta) {
        throw AppError.badRequest("La fecha está fuera de la vigencia de la resolución");
      }
    }

    // Recalcular SIEMPRE en el servidor; ignorar los totales enviados por el cliente.
    const { detallesNormalizados, subtotal, impuestoNeto, total, impuestos } =
      await computeTotals(input.idCliente, lineas);

    data.subtotalFactura = subtotal;
    data.impuestoFactura = impuestoNeto;
    data.totalFactura = total;
    data.detalleProducto = JSON.stringify({ items: detallesNormalizados, impuestos });

    // Estado inicial y saldo pendiente: factura nace PENDIENTE con saldo = total.
    const dataConEstado = { ...data, estado: "PENDIENTE", saldoPendiente: total };

    // Validar stock ANTES de crear la factura, para no dejar la factura huérfana.
    const lineasInventario = detallesNormalizados.filter(
      (d): d is DetalleInput & { idProducto: number } =>
        d.idProducto !== null && d.idProducto !== undefined,
    );
    const productosCache = new Map<number, { nombre: string; stock: number }>();
    for (const d of lineasInventario) {
      const producto = await prisma.producto.findUnique({ where: { id: d.idProducto } });
      if (!producto) {
        throw AppError.badRequest(`El producto indicado (id ${d.idProducto}) no existe`);
      }
      const prev = productosCache.get(d.idProducto);
      const stockDisponible = prev ? prev.stock : producto.cantidadProducto;
      if (stockDisponible < d.cantidad) {
        throw AppError.badRequest(`Stock insuficiente para ${producto.nombreProducto}`);
      }
      productosCache.set(d.idProducto, {
        nombre: producto.nombreProducto,
        stock: stockDisponible - d.cantidad,
      });
    }

    const factura = await facturasRepository.create(dataConEstado, detallesNormalizados);

    // Movimiento de inventario (SALIDA) por cada línea con producto asociado.
    for (const d of lineasInventario) {
      const producto = await prisma.producto.findUnique({ where: { id: d.idProducto } });
      if (!producto) continue;
      const nuevoStock = producto.cantidadProducto - d.cantidad;
      await prisma.producto.update({
        where: { id: d.idProducto },
        data: { cantidadProducto: nuevoStock },
      });
      await prisma.movimientoInventario.create({
        data: {
          idProducto: d.idProducto,
          tipo: "SALIDA",
          cantidad: d.cantidad,
          saldoResultante: nuevoStock,
          motivo: `Factura N° ${factura.numeroFactura}`,
        },
      });
    }

    // Partida doble: registra el asiento contable de la venta.
    await partidaDoble.generarDesdeFactura(factura);

    return factura;
  },

  async update(id: number, input: Partial<CreateFacturaInput>): Promise<Factura> {
    const f = await facturasRepository.findById(id);
    if (!f) throw AppError.notFound("Factura no encontrada");
    const { detalles, ...data } = input;

    // Solo recalcular si llegan detalles; si no, se dejan los totales tal cual.
    if (detalles) {
      const idCliente = input.idCliente ?? f.idCliente;
      const { detallesNormalizados, subtotal, impuestoNeto, total, impuestos } =
        await computeTotals(idCliente, detalles);

      data.subtotalFactura = subtotal;
      data.impuestoFactura = impuestoNeto;
      data.totalFactura = total;
      data.detalleProducto = JSON.stringify({ items: detallesNormalizados, impuestos });

      const actualizada = await facturasRepository.update(id, data, detallesNormalizados);
      // Recalcula el asiento contable con los nuevos totales.
      await partidaDoble.generarDesdeFactura(actualizada);
      return actualizada;
    }

    return facturasRepository.update(id, data, undefined);
  },

  async delete(id: number): Promise<void> {
    const f = await facturasRepository.findById(id);
    if (!f) throw AppError.notFound("Factura no encontrada");
    // Elimina el asiento contable asociado antes de borrar la factura.
    await partidaDoble.eliminarPorOrigen("FACTURA", id);
    await facturasRepository.delete(id);
  },
};
