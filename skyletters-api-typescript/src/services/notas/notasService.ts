import { notasRepository, type DetalleInput } from "../../repositories/notasRepository";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { partidaDoble } from "../partidaDoble/partidaDobleService";
import type { NotaContable } from "@prisma/client";

export type TipoNota = "CREDITO" | "DEBITO";

export interface CreateNotaInput {
  tipo: string;
  numero: number;
  idFactura: number;
  idCliente: number;
  fecha: Date;
  motivo: string;
  detalleProducto: string;
  subtotal: number;
  impuesto: number;
  total: number;
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
 * Recalcula en el servidor el subtotal, impuesto neto y total de la nota
 * a partir de los detalles y de los impuestos del cliente. Replica EXACTAMENTE
 * la lógica de facturasService para que front y back coincidan.
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

export const notasService = {
  async getAll(): Promise<NotaContable[]> {
    return notasRepository.findAll();
  },

  async getById(id: number): Promise<NotaContable | null> {
    return notasRepository.findById(id);
  },

  // Siguiente número consecutivo por tipo de nota, según la resolución DIAN activa.
  async getNextNumber(tipo: TipoNota): Promise<number> {
    const last = await prisma.notaContable.findFirst({
      where: { tipo },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    if (last) return last.numero + 1;
    // Primera nota: arranca en el número inicial de la resolución activa del tipo correspondiente.
    const tipoDocumento = tipo === "CREDITO" ? "NOTA_CREDITO" : "NOTA_DEBITO";
    const res = await prisma.resolucionFacturacion.findFirst({
      where: { tipoDocumento, estado: true },
      orderBy: { id: "desc" },
    });
    return res?.numeroInicial ?? 1;
  },

  async create(input: CreateNotaInput): Promise<NotaContable> {
    const factura = await prisma.factura.findUnique({ where: { id: input.idFactura } });
    if (!factura) throw AppError.badRequest("La factura origen indicada no existe");
    const cliente = await prisma.cliente.findUnique({ where: { id: input.idCliente } });
    if (!cliente) throw AppError.badRequest("El cliente indicado no existe");
    const { detalles, ...data } = input;
    const lineas = detalles ?? [];

    // Enforcement de resolución DIAN según el tipo de nota.
    const tipoDocumento = input.tipo === "CREDITO" ? "NOTA_CREDITO" : "NOTA_DEBITO";
    const resolucion = await prisma.resolucionFacturacion.findFirst({
      where: { tipoDocumento, estado: true },
      orderBy: { id: "desc" },
    });
    if (resolucion) {
      if (input.numero < resolucion.numeroInicial || input.numero > resolucion.numeroFinal) {
        throw AppError.badRequest("El número está fuera del rango autorizado por la resolución");
      }
      const fecha = new Date(input.fecha);
      if (fecha < resolucion.vigenciaDesde || fecha > resolucion.vigenciaHasta) {
        throw AppError.badRequest("La fecha está fuera de la vigencia de la resolución");
      }
    }

    // Recalcular SIEMPRE en el servidor; ignorar los totales enviados por el cliente.
    const { detallesNormalizados, subtotal, impuestoNeto, total, impuestos } =
      await computeTotals(input.idCliente, lineas);

    data.subtotal = subtotal;
    data.impuesto = impuestoNeto;
    data.total = total;
    data.detalleProducto = JSON.stringify({ items: detallesNormalizados, impuestos });

    const nota = await notasRepository.create(data, detallesNormalizados);

    // Nota CRÉDITO = devolución: reingresa stock (ENTRADA). DÉBITO no toca inventario.
    if (input.tipo === "CREDITO") {
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
            motivo: `Nota crédito N° ${nota.numero}`,
          },
        });
      }
    }

    // Partida doble: registra el asiento contable de la nota.
    await partidaDoble.generarDesdeNota(nota);

    return nota;
  },

  async update(id: number, input: Partial<CreateNotaInput>): Promise<NotaContable> {
    const n = await notasRepository.findById(id);
    if (!n) throw AppError.notFound("Nota no encontrada");
    const { detalles, ...data } = input;

    // Solo recalcular si llegan detalles; si no, se dejan los totales tal cual.
    if (detalles) {
      const idCliente = input.idCliente ?? n.idCliente;
      const { detallesNormalizados, subtotal, impuestoNeto, total, impuestos } =
        await computeTotals(idCliente, detalles);

      data.subtotal = subtotal;
      data.impuesto = impuestoNeto;
      data.total = total;
      data.detalleProducto = JSON.stringify({ items: detallesNormalizados, impuestos });

      const actualizada = await notasRepository.update(id, data, detallesNormalizados);
      await partidaDoble.generarDesdeNota(actualizada);
      return actualizada;
    }

    return notasRepository.update(id, data, undefined);
  },

  async delete(id: number): Promise<void> {
    const n = await notasRepository.findById(id);
    if (!n) throw AppError.notFound("Nota no encontrada");
    await partidaDoble.eliminarPorOrigen("NOTA", id);
    await notasRepository.delete(id);
  },
};
