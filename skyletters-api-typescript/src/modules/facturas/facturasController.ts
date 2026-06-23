import { Response, NextFunction } from "express";
import { facturasService } from "../../services/facturas/facturasService";
import type { AuthRequest } from "../../middlewares/auth";

export const facturasController = {
  async getAll(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await facturasService.getAll();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getNextNumber(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const numeroFactura = await facturasService.getNextNumber();
      res.json({ success: true, data: { numeroFactura } });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = await facturasService.getById(id);
      if (!data) {
        res.status(404).json({ success: false, message: "Factura no encontrada" });
        return;
      }
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await facturasService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = await facturasService.update(id, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      await facturasService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
