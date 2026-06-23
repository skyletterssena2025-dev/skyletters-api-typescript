import { Response, NextFunction } from "express";
import { conciliacionService } from "../../services/conciliacion/conciliacionService";
import type { AuthRequest } from "../../middlewares/auth";

export const conciliacionController = {
  async getAll(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await conciliacionService.getAll();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = await conciliacionService.getById(id);
      if (!data) {
        res.status(404).json({ success: false, message: "Conciliación no encontrada" });
        return;
      }
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await conciliacionService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = await conciliacionService.update(id, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      await conciliacionService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  /** Carga (reemplaza) las lineas del extracto bancario de la conciliacion. */
  async cargarExtracto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = await conciliacionService.cargarExtracto(id, req.body.movimientos ?? []);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /** Ejecuta el cruce automatico extracto vs libro y devuelve el detalle. */
  async conciliar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = await conciliacionService.conciliar(id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /** Detalle de la conciliacion (extracto, libro y totales con diferencia). */
  async getDetalle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = await conciliacionService.getDetalle(id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};
