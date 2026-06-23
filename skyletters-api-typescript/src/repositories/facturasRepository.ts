import { prisma } from "../config/database";
import type { Factura } from "@prisma/client";

export interface DetalleInput {
  nombre: string;
  cantidad: number;
  precio: number;
  descuento?: number;
  subtotal: number;
  idProducto?: number | null;
}

export interface FacturaData {
  numeroFactura: number;
  idCliente: number;
  fechaFactura: Date;
  detalleProducto: string;
  subtotalFactura: number;
  impuestoFactura: number;
  totalFactura: number;
  formaPago: string;
  estado?: string;
  saldoPendiente?: number;
}

const includeRel = { cliente: true, detalles: true } as const;

export const facturasRepository = {
  async findAll(): Promise<Factura[]> {
    return prisma.factura.findMany({ orderBy: { id: "desc" }, include: includeRel });
  },

  async findById(id: number): Promise<Factura | null> {
    return prisma.factura.findUnique({ where: { id }, include: includeRel });
  },

  async create(data: FacturaData, detalles: DetalleInput[] = []): Promise<Factura> {
    return prisma.factura.create({
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
    data: Partial<FacturaData>,
    detalles?: DetalleInput[],
  ): Promise<Factura> {
    return prisma.factura.update({
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

  async delete(id: number): Promise<Factura> {
    return prisma.factura.delete({ where: { id } });
  },
};
