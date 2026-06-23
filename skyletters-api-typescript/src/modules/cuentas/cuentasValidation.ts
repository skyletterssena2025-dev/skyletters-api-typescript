import { z } from "zod";

export const createCuentaSchema = z.object({
  body: z.object({
    codigo: z.string().min(1, "El codigo es requerido"),
    nombre: z.string().min(1, "El nombre es requerido"),
    clase: z.coerce.number().int().min(1).max(9).optional(),
    naturaleza: z.enum(["DEBITO", "CREDITO"]),
    aceptaMovimiento: z.coerce.boolean().optional(),
    estado: z.coerce.boolean().optional(),
  }),
});

export const updateCuentaSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    codigo: z.string().min(1).optional(),
    nombre: z.string().min(1).optional(),
    clase: z.coerce.number().int().min(1).max(9).optional(),
    naturaleza: z.enum(["DEBITO", "CREDITO"]).optional(),
    aceptaMovimiento: z.coerce.boolean().optional(),
    estado: z.coerce.boolean().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
