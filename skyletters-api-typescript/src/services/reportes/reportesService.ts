import { reportesRepository } from "../../repositories/reportesRepository";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import type { ReporteFinanciero } from "@prisma/client";

export interface CreateReporteInput {
  tipo: string;
  formato: string;
  movimientoContable: string;
  descripcion: string;
  periodoInicio: Date;
  periodoFin: Date;
}

export const reportesService = {
  async getAll(): Promise<ReporteFinanciero[]> {
    return reportesRepository.findAll();
  },

  async getById(id: number): Promise<ReporteFinanciero | null> {
    return reportesRepository.findById(id);
  },

  async create(input: CreateReporteInput): Promise<ReporteFinanciero> {
    return reportesRepository.create(input);
  },

  async update(id: number, data: Partial<CreateReporteInput>): Promise<ReporteFinanciero> {
    const r = await reportesRepository.findById(id);
    if (!r) throw AppError.notFound("Reporte no encontrado");
    return reportesRepository.update(id, data);
  },

  async delete(id: number): Promise<void> {
    const r = await reportesRepository.findById(id);
    if (!r) throw AppError.notFound("Reporte no encontrado");
    await reportesRepository.delete(id);
  },

  // ===== Reportes contables reales =====

  /**
   * Estado de cuenta de un cliente: sus facturas con saldo, total facturado y
   * total pendiente.
   */
  async estadoCuentaCliente(idCliente: number) {
    const cliente = await prisma.cliente.findUnique({ where: { id: idCliente } });
    if (!cliente) throw AppError.notFound("Cliente no encontrado");

    const facturasRaw = await prisma.factura.findMany({
      where: { idCliente },
      orderBy: { fechaFactura: "asc" },
    });

    const facturas = facturasRaw.map((f) => ({
      numeroFactura: f.numeroFactura,
      fecha: f.fechaFactura,
      total: f.totalFactura,
      saldoPendiente: f.saldoPendiente,
      estado: f.estado,
    }));

    const totalFacturado = facturasRaw.reduce((sum, f) => sum + f.totalFactura, 0);
    const totalPendiente = facturasRaw.reduce((sum, f) => sum + f.saldoPendiente, 0);

    return { cliente, facturas, totalFacturado, totalPendiente };
  },

  /**
   * Ventas por período: totales (count, subtotal, impuesto, total) de las
   * facturas cuyo `fechaFactura` está entre `desde` y `fin`, más una lista
   * resumida de cada factura.
   */
  async ventasPorPeriodo(desde: Date, fin: Date) {
    const facturas = await prisma.factura.findMany({
      where: { fechaFactura: { gte: desde, lte: fin } },
      orderBy: { fechaFactura: "asc" },
    });

    const count = facturas.length;
    const subtotal = facturas.reduce((sum, f) => sum + f.subtotalFactura, 0);
    const impuesto = facturas.reduce((sum, f) => sum + f.impuestoFactura, 0);
    const total = facturas.reduce((sum, f) => sum + f.totalFactura, 0);

    const lista = facturas.map((f) => ({
      numeroFactura: f.numeroFactura,
      idCliente: f.idCliente,
      fecha: f.fechaFactura,
      subtotal: f.subtotalFactura,
      impuesto: f.impuestoFactura,
      total: f.totalFactura,
      estado: f.estado,
    }));

    return {
      desde,
      fin,
      totales: { count, subtotal, impuesto, total },
      facturas: lista,
    };
  },

  /**
   * Cartera (CxC): agrupa las facturas con saldo pendiente (> 0) por cliente.
   */
  async cartera() {
    const facturas = await prisma.factura.findMany({
      where: { saldoPendiente: { gt: 0 } },
      include: { cliente: true },
    });

    const map = new Map<
      number,
      { idCliente: number; nombreCliente: string; totalPendiente: number; facturas: number }
    >();

    for (const f of facturas) {
      const existente = map.get(f.idCliente);
      if (existente) {
        existente.totalPendiente += f.saldoPendiente;
        existente.facturas += 1;
      } else {
        map.set(f.idCliente, {
          idCliente: f.idCliente,
          nombreCliente: f.cliente.nombreCliente,
          totalPendiente: f.saldoPendiente,
          facturas: 1,
        });
      }
    }

    const clientes = Array.from(map.values());
    const granTotalPendiente = clientes.reduce((sum, c) => sum + c.totalPendiente, 0);

    return { clientes, granTotalPendiente };
  },
};
