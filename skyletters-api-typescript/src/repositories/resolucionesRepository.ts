import { prisma } from "../config/database";
import type { ResolucionFacturacion } from "@prisma/client";

export const resolucionesRepository = {
  async findAll(): Promise<ResolucionFacturacion[]> {
    return prisma.resolucionFacturacion.findMany({ orderBy: { id: "asc" } });
  },

  async findById(id: number): Promise<ResolucionFacturacion | null> {
    return prisma.resolucionFacturacion.findUnique({ where: { id } });
  },

  async create(data: {
    tipoDocumento: string;
    resolucion: string;
    codigoAutorizacion?: string;
    prefijo?: string;
    numeroInicial: number;
    numeroFinal: number;
    vigenciaDesde: Date;
    vigenciaHasta: Date;
    estado?: boolean;
  }): Promise<ResolucionFacturacion> {
    return prisma.resolucionFacturacion.create({ data });
  },

  async update(
    id: number,
    data: Partial<Parameters<typeof prisma.resolucionFacturacion.update>[0]["data"]>
  ): Promise<ResolucionFacturacion> {
    return prisma.resolucionFacturacion.update({ where: { id }, data });
  },

  async delete(id: number): Promise<ResolucionFacturacion> {
    return prisma.resolucionFacturacion.delete({ where: { id } });
  },
};
