import { Response, NextFunction } from "express";
import { notasService, type TipoNota } from "../../services/notas/notasService";
import type { AuthRequest } from "../../middlewares/auth";

export const notasController = {
  async getAll(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await notasService.getAll();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getNextNumber(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tipo = req.query.tipo === "DEBITO" ? "DEBITO" : "CREDITO";
      const numero = await notasService.getNextNumber(tipo as TipoNota);
      res.json({ success: true, data: { numero } });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = await notasService.getById(id);
      if (!data) {
        res.status(404).json({ success: false, message: "Nota no encontrada" });
        return;
      }
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await notasService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = await notasService.update(id, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      await notasService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
