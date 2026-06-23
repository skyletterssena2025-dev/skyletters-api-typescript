import { z } from "zod";

const detalleSchema = z.object({
  nombre: z.string().trim().min(1, "La descripción del ítem es obligatoria"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  precio: z.number().nonnegative("El precio no puede ser negativo"),
  descuento: z.number().min(0).max(100, "El descuento debe estar entre 0 y 100").optional(),
  subtotal: z.number().nonnegative(),
  idProducto: z.number().int().nullable().optional(),
});

export const createFacturaSchema = z.object({
  body: z.object({
    numeroFactura: z.number().int().positive("El número de factura debe ser mayor a 0"),
    idCliente: z.number().int(),
    fechaFactura: z.coerce.date(),
    detalleProducto: z.string(),
    subtotalFactura: z.number().nonnegative(),
    impuestoFactura: z.number(),
    totalFactura: z.number().nonnegative(),
    formaPago: z.string(),
    detalles: z.array(detalleSchema).min(1, "Agrega al menos un artículo"),
  }),
});

export const updateFacturaSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    numeroFactura: z.number().int().optional(),
    idCliente: z.number().int().optional(),
    fechaFactura: z.coerce.date().optional(),
    detalleProducto: z.string().optional(),
    subtotalFactura: z.number().optional(),
    impuestoFactura: z.number().optional(),
    totalFactura: z.number().optional(),
    formaPago: z.string().optional(),
    detalles: z.array(detalleSchema).optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
