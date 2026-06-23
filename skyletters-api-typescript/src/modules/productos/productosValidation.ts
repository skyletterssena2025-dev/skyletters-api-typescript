import { z } from "zod";

export const createProductoSchema = z.object({
  body: z.object({
    codigoProducto: z.string().trim().min(1, "El código es obligatorio"),
    nombreProducto: z.string().trim().min(1, "El nombre es obligatorio"),
    descripcionProducto: z.string().trim().min(1, "La descripción es obligatoria"),
    precioProducto: z.number().nonnegative("El precio no puede ser negativo"),
    // El stock lo maneja el kardex (compras/ventas); opcional al crear (inicia en 0).
    cantidadProducto: z.number().int().nonnegative("La cantidad no puede ser negativa").optional(),
    estadoProducto: z.boolean().optional(),
  }),
});

export const updateProductoSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    codigoProducto: z.string().trim().min(1).optional(),
    nombreProducto: z.string().trim().min(1).optional(),
    descripcionProducto: z.string().trim().min(1).optional(),
    precioProducto: z.number().nonnegative("El precio no puede ser negativo").optional(),
    cantidadProducto: z.number().int().nonnegative("La cantidad no puede ser negativa").optional(),
    estadoProducto: z.boolean().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
