import { prisma } from "../config/database";
import type { AsientoContable, Prisma } from "@prisma/client";

export interface MovimientoInput {
  codigoCuenta: string;
  nombreCuenta: string;
  debito: number;
  credito: number;
}

export interface CreateAsientoData {
  fechaCreacionRegistro: Date;
  numeroFactura: number;
  descripcion: string;
  usuarioCreador: string;
  fechaModificacion: Date;
  listaMovimiContable: string;
  tipoOrigen?: string;
  idOrigen?: number | null;
  totalDebito?: number;
  totalCredito?: number;
}

export const asientosRepository = {
  async findAll(): Promise<AsientoContable[]> {
    return prisma.asientoContable.findMany({
      orderBy: { id: "desc" },
      include: { movimientos: true },
    });
  },

  async findById(id: number): Promise<AsientoContable | null> {
    return prisma.asientoContable.findUnique({
      where: { id },
      include: { movimientos: true },
    });
  },

  async create(data: CreateAsientoData, movimientos: MovimientoInput[] = []): Promise<AsientoContable> {
    return prisma.asientoContable.create({
      data: {
        ...data,
        movimientos: movimientos.length ? { create: movimientos } : undefined,
      },
      include: { movimientos: true },
    });
  },

  async update(
    id: number,
    data: Partial<CreateAsientoData>,
    movimientos?: MovimientoInput[],
  ): Promise<AsientoContable> {
    const payload: Prisma.AsientoContableUpdateInput = { ...data };
    // Si llegan movimientos nuevos, se reemplazan por completo.
    if (movimientos) {
      payload.movimientos = { deleteMany: {}, create: movimientos };
    }
    return prisma.asientoContable.update({
      where: { id },
      data: payload,
      include: { movimientos: true },
    });
  },

  async delete(id: number): Promise<AsientoContable> {
    return prisma.asientoContable.delete({ where: { id } });
  },
};
