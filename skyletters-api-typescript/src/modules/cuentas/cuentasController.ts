import { Response, NextFunction } from "express";
import { cuentasService } from "../../services/cuentas/cuentasService";
import type { AuthRequest } from "../../middlewares/auth";

export const cuentasController = {
  async getAll(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await cuentasService.getAll();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await cuentasService.getById(Number(req.params.id));
      if (!data) {
        res.status(404).json({ success: false, message: "Cuenta no encontrada" });
        return;
      }
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await cuentasService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await cuentasService.update(Number(req.params.id), req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await cuentasService.delete(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
