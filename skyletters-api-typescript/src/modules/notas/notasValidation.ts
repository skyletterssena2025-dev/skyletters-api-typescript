import { z } from "zod";

const detalleSchema = z.object({
  nombre: z.string().trim().min(1, "La descripción del ítem es obligatoria"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  precio: z.number().nonnegative("El precio no puede ser negativo"),
  descuento: z.number().min(0).max(100, "El descuento debe estar entre 0 y 100").optional(),
  subtotal: z.number().nonnegative(),
  idProducto: z.number().int().nullable().optional(),
});

export const createNotaSchema = z.object({
  body: z.object({
    tipo: z.enum(["CREDITO", "DEBITO"]),
    numero: z.number().int().positive("El número de nota debe ser mayor a 0"),
    idFactura: z.number().int(),
    idCliente: z.number().int(),
    fecha: z.coerce.date(),
    motivo: z.string().trim().min(1, "El motivo es obligatorio"),
    detalleProducto: z.string(),
    subtotal: z.number().nonnegative(),
    impuesto: z.number(),
    total: z.number().nonnegative(),
    detalles: z.array(detalleSchema).min(1, "Agrega al menos un artículo"),
  }),
});

export const updateNotaSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    tipo: z.enum(["CREDITO", "DEBITO"]).optional(),
    numero: z.number().int().optional(),
    idFactura: z.number().int().optional(),
    idCliente: z.number().int().optional(),
    fecha: z.coerce.date().optional(),
    motivo: z.string().trim().min(1).optional(),
    detalleProducto: z.string().optional(),
    subtotal: z.number().optional(),
    impuesto: z.number().optional(),
    total: z.number().optional(),
    detalles: z.array(detalleSchema).optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
