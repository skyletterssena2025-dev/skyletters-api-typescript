import { prisma } from "../config/database";
import type { Cliente } from "@prisma/client";

export const clientesRepository = {
  async findAll(): Promise<Cliente[]> {
    return prisma.cliente.findMany({ orderBy: { id: "asc" } });
  },

  async findById(id: number): Promise<Cliente | null> {
    return prisma.cliente.findUnique({ where: { id } });
  },

  async create(data: {
    nombreCliente: string;
    razonSocial: string;
    nitCliente: string;
    correoCliente: string;
    direccionCliente: string;
    telefonoCliente: string;
    ciudadCliente: string;
    estadoCliente?: boolean;
  }): Promise<Cliente> {
    return prisma.cliente.create({ data });
  },

  async update(
    id: number,
    data: Partial<Parameters<typeof prisma.cliente.update>[0]["data"]>
  ): Promise<Cliente> {
    return prisma.cliente.update({ where: { id }, data });
  },

  async delete(id: number): Promise<Cliente> {
    return prisma.cliente.delete({ where: { id } });
  },
};
