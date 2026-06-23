import { z } from "zod";

export const createProveedorSchema = z.object({
  body: z.object({
    nombreProveedor: z.string().trim().min(1, "El nombre es obligatorio"),
    razonSocial: z.string().trim().min(1, "La razón social es obligatoria"),
    nitProveedor: z.string().trim().min(1, "El NIT es obligatorio"),
    correoProveedor: z.string().trim().email("Correo inválido"),
    direccionProveedor: z.string().trim().min(1, "La dirección es obligatoria"),
    telefonoProveedor: z.string().trim().min(1, "El teléfono es obligatorio"),
    ciudadProveedor: z.string().trim().min(1, "La ciudad es obligatoria"),
    estadoProveedor: z.boolean().optional(),
    impuestosAplicables: z.string().optional(),
  }),
});

export const updateProveedorSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    nombreProveedor: z.string().trim().min(1).optional(),
    razonSocial: z.string().trim().min(1).optional(),
    nitProveedor: z.string().trim().min(1).optional(),
    correoProveedor: z.string().trim().email("Correo inválido").optional(),
    direccionProveedor: z.string().trim().min(1).optional(),
    telefonoProveedor: z.string().trim().min(1).optional(),
    ciudadProveedor: z.string().trim().min(1).optional(),
    estadoProveedor: z.boolean().optional(),
    impuestosAplicables: z.string().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
