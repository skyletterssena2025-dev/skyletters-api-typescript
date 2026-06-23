import { productosRepository } from "../../repositories/productosRepository";
import { AppError } from "../../utils/AppError";
import type { Producto } from "@prisma/client";

export interface CreateProductoInput {
  codigoProducto: string;
  nombreProducto: string;
  descripcionProducto: string;
  precioProducto: number;
  cantidadProducto: number;
  estadoProducto?: boolean;
}

export const productosService = {
  async getAll(): Promise<Producto[]> {
    return productosRepository.findAll();
  },

  async getById(id: number): Promise<Producto | null> {
    return productosRepository.findById(id);
  },

  async create(input: CreateProductoInput): Promise<Producto> {
    return productosRepository.create(input);
  },

  async update(id: number, data: Partial<CreateProductoInput>): Promise<Producto> {
    const p = await productosRepository.findById(id);
    if (!p) throw AppError.notFound("Producto no encontrado");
    return productosRepository.update(id, data);
  },

  async delete(id: number): Promise<void> {
    const p = await productosRepository.findById(id);
    if (!p) throw AppError.notFound("Producto no encontrado");
    await productosRepository.delete(id);
  },
};
