import { z } from "zod";

export const createPagoSchema = z.object({
  body: z.object({
    idFactura: z.number().int(),
    monto: z.number().positive(),
    formaPago: z.string().min(1),
    fecha: z.coerce.date(),
    nota: z.string().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
