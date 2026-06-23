import { z } from "zod";

const detalleSchema = z.object({
  nombre: z.string().trim().min(1, "La descripción del ítem es obligatoria"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  precio: z.number().nonnegative("El precio no puede ser negativo"),
  descuento: z.number().min(0).max(100, "El descuento debe estar entre 0 y 100").optional(),
  subtotal: z.number().nonnegative(),
  idProducto: z.number().int().nullable().optional(),
});

export const createCompraSchema = z.object({
  body: z.object({
    numeroFactura: z.number().int().positive("El número de factura debe ser mayor a 0"),
    idProveedor: z.number().int(),
    fechaCompra: z.coerce.date(),
    detalleProducto: z.string(),
    subtotal: z.number().nonnegative(),
    impuesto: z.number(),
    total: z.number().nonnegative(),
    formaPago: z.string(),
    detalles: z.array(detalleSchema).min(1, "Agrega al menos un artículo"),
  }),
});

export const updateCompraSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    numeroFactura: z.number().int().optional(),
    idProveedor: z.number().int().optional(),
    fechaCompra: z.coerce.date().optional(),
    detalleProducto: z.string().optional(),
    subtotal: z.number().optional(),
    impuesto: z.number().optional(),
    total: z.number().optional(),
    formaPago: z.string().optional(),
    detalles: z.array(detalleSchema).optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
