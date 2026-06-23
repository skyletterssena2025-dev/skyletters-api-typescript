import { z } from "zod";

export const createConciliacionSchema = z.object({
  body: z.object({
    cuentaBancaria: z.string(),
    banco: z.string(),
    periodoInicio: z.coerce.date(),
    periodoFin: z.coerce.date(),
    movimientosConciliados: z.coerce.number().int().optional(),
    // Saldos: opcionales en la creacion; los calcula el cruce automatico.
    saldoBancario: z.coerce.number().default(0),
    saldoContable: z.coerce.number().default(0),
  }),
});

const extractoLineaSchema = z.object({
  fecha: z.coerce.date(),
  descripcion: z.string().min(1),
  referencia: z.string().optional().nullable(),
  valor: z.coerce.number(),
});

export const cargarExtractoSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    movimientos: z.array(extractoLineaSchema),
  }),
});

export const updateConciliacionSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    cuentaBancaria: z.string().optional(),
    banco: z.string().optional(),
    periodoInicio: z.coerce.date().optional(),
    periodoFin: z.coerce.date().optional(),
    movimientosConciliados: z.number().int().optional(),
    saldoBancario: z.number().optional(),
    saldoContable: z.number().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
