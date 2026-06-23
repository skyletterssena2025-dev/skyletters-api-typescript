import { impuestosRepository } from "../../repositories/impuestosRepository";
import { AppError } from "../../utils/AppError";
import type { Impuesto } from "@prisma/client";

export interface CreateImpuestoInput {
  nombre: string;
  tipo: string;
  porcentaje: number;
  fechaInicio: Date;
  fechaFin: Date;
  baseImponible: number;
}

export const impuestosService = {
  async getAll(): Promise<Impuesto[]> {
    return impuestosRepository.findAll();
  },

  async getById(id: number): Promise<Impuesto | null> {
    return impuestosRepository.findById(id);
  },

  async create(input: CreateImpuestoInput): Promise<Impuesto> {
    return impuestosRepository.create(input);
  },

  async update(id: number, data: Partial<CreateImpuestoInput>): Promise<Impuesto> {
    const r = await impuestosRepository.findById(id);
    if (!r) throw AppError.notFound("Impuesto no encontrado");
    return impuestosRepository.update(id, data);
  },

  async delete(id: number): Promise<void> {
    const r = await impuestosRepository.findById(id);
    if (!r) throw AppError.notFound("Impuesto no encontrado");
    await impuestosRepository.delete(id);
  },
};
