import { prisma } from "../config/database";
import type { Proveedor } from "@prisma/client";

export interface CreateProveedorData {
    nombreProveedor: string;
    razonSocial: string;
    nitProveedor: string;
    correoProveedor: string;
    telefonoProveedor: string;
    direccionProveedor: string;
    ciudadProveedor: string;
    estadoProveedor?: boolean;
}

export const proveedoresRepository = {
    async findAll(): Promise<Proveedor[]> {
        return prisma.proveedor.findMany({ orderBy: { id: "asc" } });
    },

    async findById(id: number): Promise<Proveedor | null> {
        return prisma.proveedor.findUnique({ where: { id } });
    },

    async create(data: CreateProveedorData): Promise<Proveedor> {
        return prisma.proveedor.create({ data });
    },

    async update(
        id: number,
        data: Partial<CreateProveedorData>
    ): Promise<Proveedor> {
        return prisma.proveedor.update({ where: { id }, data });
    },

    async delete(id: number): Promise<Proveedor> {
        return prisma.proveedor.delete({ where: { id } });
    },
};
