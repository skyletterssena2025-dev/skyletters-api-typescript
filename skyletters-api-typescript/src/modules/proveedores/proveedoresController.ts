import { Response, NextFunction } from "express";
import { proveedoresServices } from "../../services/proveedores/proveedoresServices";
import type { AuthRequest } from "../../middlewares/auth";

export const proveedoresController = {
    async getAll(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await proveedoresServices.getAll();
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = Number(req.params.id);
            const data = await proveedoresServices.getById(id);
            if (!data) {
                res.status(404).json({ success: false, message: "Proveedor no encontrado" });
                return;
            }
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await proveedoresServices.create(req.body);
            res.status(201).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = Number(req.params.id);
            const data = await proveedoresServices.update(id, req.body);
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = Number(req.params.id);
            await proveedoresServices.delete(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },
};
