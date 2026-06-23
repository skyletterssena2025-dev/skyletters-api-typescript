import { Response, NextFunction } from "express";
import { usuariosService } from "../../services/usuarios/usuariosService";
import type { AuthRequest } from "../../middlewares/auth";

export const usuariosController = {
  async getAll(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await usuariosService.getAll();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = await usuariosService.getById(id);
      if (!data) {
        res.status(404).json({ success: false, message: "Usuario no encontrado" });
        return;
      }
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await usuariosService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      // Evita que un usuario se bloquee a si mismo (quedaria sin acceso).
      if (req.body?.estadoUsuario === false && req.user?.sub === id) {
        res.status(400).json({ success: false, message: "No puedes bloquear tu propia cuenta" });
        return;
      }
      const data = await usuariosService.update(id, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      await usuariosService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
