import { z } from "zod";

export const createClienteSchema = z.object({
  body: z.object({
    nombreCliente: z.string().trim().min(1, "El nombre es obligatorio"),
    razonSocial: z.string().trim().min(1, "La razón social es obligatoria"),
    nitCliente: z.string().trim().min(1, "El NIT es obligatorio"),
    correoCliente: z.string().trim().email("Correo inválido"),
    direccionCliente: z.string().trim().min(1, "La dirección es obligatoria"),
    telefonoCliente: z.string().trim().min(1, "El teléfono es obligatorio"),
    ciudadCliente: z.string().trim().min(1, "La ciudad es obligatoria"),
    estadoCliente: z.boolean().optional(),
    impuestosAplicables: z.string().optional(),
  }),
});

export const updateClienteSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    nombreCliente: z.string().trim().min(1).optional(),
    razonSocial: z.string().trim().min(1).optional(),
    nitCliente: z.string().trim().min(1).optional(),
    correoCliente: z.string().trim().email("Correo inválido").optional(),
    direccionCliente: z.string().trim().min(1).optional(),
    telefonoCliente: z.string().trim().min(1).optional(),
    ciudadCliente: z.string().trim().min(1).optional(),
    estadoCliente: z.boolean().optional(),
    impuestosAplicables: z.string().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
