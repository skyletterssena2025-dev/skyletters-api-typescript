import { Response, NextFunction } from "express";
import { pagosService } from "../../services/pagos/pagosService";
import type { AuthRequest } from "../../middlewares/auth";

export const pagosController = {
  async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const idFactura = req.query.idFactura;
      if (idFactura !== undefined) {
        const data = await pagosService.getByFactura(Number(idFactura));
        res.json({ success: true, data });
        return;
      }
      const data = await pagosService.getAll();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getByFactura(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const idFactura = Number(req.query.idFactura);
      const data = await pagosService.getByFactura(idFactura);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async registrar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await pagosService.registrar(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      await pagosService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
