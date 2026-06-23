import { resolucionesRepository } from "../../repositories/resolucionesRepository";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import type { ResolucionFacturacion } from "@prisma/client";

export type ResolucionConSecuencia = ResolucionFacturacion & {
  proximoNumero: number;
  disponibles: number;
  usados: number;
};

// Enriquece una resolución con su secuencia actual (cuántos consecutivos se han usado).
async function conSecuencia(r: ResolucionFacturacion): Promise<ResolucionConSecuencia> {
  let usados = 0;
  if (r.tipoDocumento === "FACTURA_VENTA") {
    const last = await prisma.factura.findFirst({
      where: { numeroFactura: { gte: r.numeroInicial, lte: r.numeroFinal } },
      orderBy: { numeroFactura: "desc" },
      select: { numeroFactura: true },
    });
    usados = last ? last.numeroFactura - r.numeroInicial + 1 : 0;
  }
  // Las notas crédito/débito aún no tienen documentos -> 0 usados.
  const proximoNumero = r.numeroInicial + usados;
  const disponibles = r.numeroFinal - proximoNumero + 1;
  return { ...r, usados, proximoNumero, disponibles };
}

export interface CreateResolucionInput {
  tipoDocumento: string;
  resolucion: string;
  codigoAutorizacion?: string;
  prefijo?: string;
  numeroInicial: number;
  numeroFinal: number;
  vigenciaDesde: Date;
  vigenciaHasta: Date;
  estado?: boolean;
}

export const resolucionesService = {
  async getAll(): Promise<ResolucionConSecuencia[]> {
    const items = await resolucionesRepository.findAll();
    return Promise.all(items.map(conSecuencia));
  },

  async getById(id: number): Promise<ResolucionFacturacion | null> {
    return resolucionesRepository.findById(id);
  },

  async create(input: CreateResolucionInput): Promise<ResolucionFacturacion> {
    return resolucionesRepository.create(input);
  },

  async update(id: number, data: Partial<CreateResolucionInput>): Promise<ResolucionFacturacion> {
    const r = await resolucionesRepository.findById(id);
    if (!r) throw AppError.notFound("Resolución no encontrada");
    return resolucionesRepository.update(id, data);
  },

  async delete(id: number): Promise<void> {
    const r = await resolucionesRepository.findById(id);
    if (!r) throw AppError.notFound("Resolución no encontrada");
    await resolucionesRepository.delete(id);
  },
};
