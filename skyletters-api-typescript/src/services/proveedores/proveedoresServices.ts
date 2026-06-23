import { proveedoresRepository, type CreateProveedorData } from "../../repositories/proveedoresRepository";
import { AppError } from "../../utils/AppError";
import type { Proveedor } from "@prisma/client";

export const proveedoresServices = {
    async getAll(): Promise<Proveedor[]> {
        return proveedoresRepository.findAll();
    },

    async getById(id: number): Promise<Proveedor | null> {
        return proveedoresRepository.findById(id);
    },

    async create(data: CreateProveedorData): Promise<Proveedor> {
        return proveedoresRepository.create(data);
    },

    async update(id: number, data: Partial<CreateProveedorData>): Promise<Proveedor> {
        const proveedor = await proveedoresRepository.findById(id);
        if (!proveedor) throw AppError.notFound("Proveedor no encontrado");
        return proveedoresRepository.update(id, data);
    },

    async delete(id: number): Promise<void> {
        const proveedor = await proveedoresRepository.findById(id);
        if (!proveedor) throw AppError.notFound("Proveedor no encontrado");
        // Borrado lógico (soft-delete): se marca el proveedor como inactivo en
        // lugar de eliminarlo físicamente, preservando la integridad contable.
        await proveedoresRepository.update(id, { estadoProveedor: false });
    },
};
