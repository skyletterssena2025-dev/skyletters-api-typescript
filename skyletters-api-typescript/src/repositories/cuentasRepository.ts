import { prisma } from "../config/database";
import type { CuentaPUC } from "@prisma/client";

export interface CuentaData {
  codigo: string;
  nombre: string;
  clase: number;
  naturaleza: string;
  aceptaMovimiento?: boolean;
  estado?: boolean;
}

export const cuentasRepository = {
  async findAll(): Promise<CuentaPUC[]> {
    return prisma.cuentaPUC.findMany({ orderBy: { codigo: "asc" } });
  },

  async findById(id: number): Promise<CuentaPUC | null> {
    return prisma.cuentaPUC.findUnique({ where: { id } });
  },

  async findByCodigo(codigo: string): Promise<CuentaPUC | null> {
    return prisma.cuentaPUC.findUnique({ where: { codigo } });
  },

  async create(data: CuentaData): Promise<CuentaPUC> {
    return prisma.cuentaPUC.create({ data });
  },

  async update(id: number, data: Partial<CuentaData>): Promise<CuentaPUC> {
    return prisma.cuentaPUC.update({ where: { id }, data });
  },

  async delete(id: number): Promise<CuentaPUC> {
    return prisma.cuentaPUC.delete({ where: { id } });
  },
};
