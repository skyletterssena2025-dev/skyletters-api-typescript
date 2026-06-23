import { z } from "zod";

const movimientoSchema = z.object({
  codigoCuenta: z.string().min(1),
  nombreCuenta: z.string().min(1),
  debito: z.coerce.number().min(0).default(0),
  credito: z.coerce.number().min(0).default(0),
});

export const createAsientoSchema = z.object({
  body: z.object({
    fechaCreacionRegistro: z.coerce.date(),
    numeroFactura: z.coerce.number(),
    descripcion: z.string().min(1),
    usuarioCreador: z.string().min(1),
    fechaModificacion: z.coerce.date(),
    listaMovimiContable: z.string().optional(),
    movimientos: z.array(movimientoSchema).optional(),
  }),
});

export const updateAsientoSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    fechaCreacionRegistro: z.coerce.date().optional(),
    numeroFactura: z.coerce.number().optional(),
    descripcion: z.string().optional(),
    usuarioCreador: z.string().optional(),
    fechaModificacion: z.coerce.date().optional(),
    listaMovimiContable: z.string().optional(),
    movimientos: z.array(movimientoSchema).optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
