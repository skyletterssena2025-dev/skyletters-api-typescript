import { prisma } from "../config/database";
import type { Pago, Prisma } from "@prisma/client";

const includeRel = { factura: true } as const;

export const pagosRepository = {
  async findAll(): Promise<Pago[]> {
    return prisma.pago.findMany({ orderBy: { id: "desc" }, include: includeRel });
  },

  async findById(id: number): Promise<Pago | null> {
    return prisma.pago.findUnique({ where: { id }, include: includeRel });
  },

  async findByFactura(idFactura: number): Promise<Pago[]> {
    return prisma.pago.findMany({
      where: { idFactura },
      orderBy: { id: "desc" },
      include: includeRel,
    });
  },

  async create(
    data: {
      idFactura: number;
      fecha: Date;
      monto: number;
      formaPago: string;
      nota?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Pago> {
    const client = tx ?? prisma;
    return client.pago.create({ data, include: includeRel });
  },

  async delete(id: number, tx?: Prisma.TransactionClient): Promise<Pago> {
    const client = tx ?? prisma;
    return client.pago.delete({ where: { id } });
  },
};
