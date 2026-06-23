import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { env } from "../config/env";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors = err.flatten().fieldErrors;
    // Construye un mensaje legible: "campo: error; campo2: error".
    const message =
      Object.entries(fieldErrors)
        .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(", ")}`)
        .join(" · ") || "Error de validación";
    res.status(400).json({
      success: false,
      message,
      errors: fieldErrors,
    });
    return;
  }

  // Errores conocidos de Prisma (unicidad, FK, no encontrado).
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      // En MySQL `target` es el nombre del índice (string); en PG es un array.
      const raw = err.meta?.target;
      const field = Array.isArray(raw) ? raw.join(", ") : String(raw ?? "");
      const friendly = /codigo|codigo_producto/.test(field)
        ? "el código"
        : /numero_factura/.test(field)
          ? "el número de factura"
          : "ese valor";
      res.status(409).json({
        success: false,
        message: `Ya existe un registro con ${friendly}. Debe ser único.`,
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ success: false, message: "Registro no encontrado." });
      return;
    }
    if (err.code === "P2003") {
      res.status(400).json({
        success: false,
        message: "Referencia inválida: el registro relacionado no existe.",
      });
      return;
    }
  }

  logger.error(err.message, { stack: err.stack });

  const statusCode = 500;
  const message =
    env.NODE_ENV === "production" ? "Error interno del servidor" : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
