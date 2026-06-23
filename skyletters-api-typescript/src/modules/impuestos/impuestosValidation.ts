import { z } from "zod";

export const createImpuestoSchema = z.object({
  body: z
    .object({
      nombre: z.string().trim().min(1, "El nombre es obligatorio"),
      tipo: z.string().trim().min(1, "El tipo es obligatorio"),
      porcentaje: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
      fechaInicio: z.coerce.date(),
      fechaFin: z.coerce.date(),
      baseImponible: z.number().nonnegative("La base no puede ser negativa"),
    })
    .refine((d) => d.fechaFin >= d.fechaInicio, {
      message: "La fecha fin debe ser igual o posterior a la fecha inicio",
      path: ["fechaFin"],
    }),
});

export const updateImpuestoSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z
    .object({
      nombre: z.string().trim().min(1).optional(),
      tipo: z.string().trim().min(1).optional(),
      porcentaje: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%").optional(),
      fechaInicio: z.coerce.date().optional(),
      fechaFin: z.coerce.date().optional(),
      baseImponible: z.number().nonnegative("La base no puede ser negativa").optional(),
    })
    .refine((d) => !d.fechaInicio || !d.fechaFin || d.fechaFin >= d.fechaInicio, {
      message: "La fecha fin debe ser igual o posterior a la fecha inicio",
      path: ["fechaFin"],
    }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
