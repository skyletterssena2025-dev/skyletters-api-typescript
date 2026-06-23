import { prisma } from "../config/database";
import type { Compra } from "@prisma/client";

export interface DetalleInput {
  nombre: string;
  cantidad: number;
  precio: number;
  descuento?: number;
  subtotal: number;
  idProducto?: number | null;
}

export interface CompraData {
  numeroFactura: number;
  idProveedor: number;
  fechaCompra: Date;
  detalleProducto: string;
  subtotal: number;
  impuesto: number;
  total: number;
  formaPago: string;
  estado?: string;
  saldoPendiente?: number;
}

const includeRel = { proveedor: true, detalles: true } as const;

export const comprasRepository = {
  async findAll(): Promise<Compra[]> {
    return prisma.compra.findMany({ orderBy: { id: "desc" }, include: includeRel });
  },

  async findById(id: number): Promise<Compra | null> {
    return prisma.compra.findUnique({ where: { id }, include: includeRel });
  },

  async create(data: CompraData, detalles: DetalleInput[] = []): Promise<Compra> {
    return prisma.compra.create({
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
    data: Partial<CompraData>,
    detalles?: DetalleInput[],
  ): Promise<Compra> {
    return prisma.compra.update({
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

  async delete(id: number): Promise<Compra> {
    return prisma.compra.delete({ where: { id } });
  },
};
