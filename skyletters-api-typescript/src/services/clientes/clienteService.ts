import { clientesRepository } from "../../repositories/clientesRepository";
import { AppError } from "../../utils/AppError";
import type { Cliente } from "@prisma/client";

export interface CreateClienteInput {
  nombreCliente: string;
  razonSocial: string;
  nitCliente: string;
  correoCliente: string;
  direccionCliente: string;
  telefonoCliente: string;
  ciudadCliente: string;
  estadoCliente?: boolean;
}

export const clienteService = {
  async getAll(): Promise<Cliente[]> {
    return clientesRepository.findAll();
  },

  async getById(id: number): Promise<Cliente | null> {
    return clientesRepository.findById(id);
  },

  async create(input: CreateClienteInput): Promise<Cliente> {
    return clientesRepository.create(input);
  },

  async update(id: number, data: Partial<CreateClienteInput>): Promise<Cliente> {
    const c = await clientesRepository.findById(id);
    if (!c) throw AppError.notFound("Cliente no encontrado");
    return clientesRepository.update(id, data);
  },

  async delete(id: number): Promise<void> {
    const c = await clientesRepository.findById(id);
    if (!c) throw AppError.notFound("Cliente no encontrado");
    // Borrado lógico (soft-delete): se marca el cliente como inactivo en lugar
    // de eliminarlo físicamente, preservando la integridad referencial contable.
    await clientesRepository.update(id, { estadoCliente: false });
  },
};
