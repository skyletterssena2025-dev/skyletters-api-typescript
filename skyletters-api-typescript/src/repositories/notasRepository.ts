import { prisma } from "../config/database";
import type { NotaContable } from "@prisma/client";

export interface DetalleInput {
  nombre: string;
  cantidad: number;
  precio: number;
  descuento?: number;
  subtotal: number;
  idProducto?: number | null;
}

export interface NotaData {
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
}

const includeRel = { factura: true, cliente: true, detalles: true } as const;

export const notasRepository = {
  async findAll(): Promise<NotaContable[]> {
    return prisma.notaContable.findMany({ orderBy: { id: "desc" }, include: includeRel });
  },

  async findById(id: number): Promise<NotaContable | null> {
    return prisma.notaContable.findUnique({ where: { id }, include: includeRel });
  },

  async create(data: NotaData, detalles: DetalleInput[] = []): Promise<NotaContable> {
    return prisma.notaContable.create({
      data: {
        ...data,
        detalles: {
          create: detalles.map((d) => ({
            nombre: d.nombre,
            cantidad: d.cantidad,
            precio: d.precio,
            descuento: d.descuento ?? 0,
            subtotal: d.subtotal,
            idProducto: d.idProducto ?? null,
          })),
        },
      },
      include: includeRel,
    });
  },

  async update(
    id: number,
    data: Partial<NotaData>,
    detalles?: DetalleInput[],
  ): Promise<NotaContable> {
    return prisma.notaContable.update({
      where: { id },
      data: {
        ...data,
        // Si llegan detalles, se reemplazan por completo.
        ...(detalles
          ? {
              detalles: {
                deleteMany: {},
                create: detalles.map((d) => ({
                  nombre: d.nombre,
                  cantidad: d.cantidad,
                  precio: d.precio,
                  descuento: d.descuento ?? 0,
                  subtotal: d.subtotal,
                  idProducto: d.idProducto ?? null,
                })),
              },
            }
          : {}),
      },
      include: includeRel,
    });
  },

  async delete(id: number): Promise<NotaContable> {
    return prisma.notaContable.delete({ where: { id } });
  },
};
