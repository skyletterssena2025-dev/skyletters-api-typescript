import { prisma } from "../config/database";
import type { Producto } from "@prisma/client";

export const productosRepository = {
  async findAll(): Promise<Producto[]> {
    return prisma.producto.findMany({ orderBy: { id: "asc" } });
  },

  async findById(id: number): Promise<Producto | null> {
    return prisma.producto.findUnique({ where: { id } });
  },

  async create(data: {
    codigoProducto: string;
    nombreProducto: string;
    descripcionProducto: string;
    precioProducto: number;
    cantidadProducto: number;
    estadoProducto?: boolean;
  }): Promise<Producto> {
    return prisma.producto.create({ data });
  },

  async update(
    id: number,
    data: Partial<Parameters<typeof prisma.producto.update>[0]["data"]>
  ): Promise<Producto> {
    return prisma.producto.update({ where: { id }, data });
  },

  async delete(id: number): Promise<Producto> {
    return prisma.producto.delete({ where: { id } });
  },
};
