import { z } from "zod";

// Datos opcionales de la persona asociada al usuario.
const personaSchema = z
  .object({
    nombrePersona: z.string().min(1),
    apellidoPersona: z.string().min(1),
    correoPersona: z.string().email().optional(),
    direccionPersona: z.string().optional(),
    telefonoPersona: z.string().optional(),
    generoPersona: z.string().optional(),
    fechaNacimientoPersona: z.string().optional(),
  })
  .optional();

export const createUsuarioSchema = z.object({
  body: z.object({
    // Nucleo requerido (suficiente para crear un usuario funcional).
    nombreUsuario: z.string().min(1, "El nombre es requerido"),
    correoUsuario: z.string().email("Correo invalido"),
    contrasenaUsuario: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
    rolUsuario: z.string().min(1, "El rol es requerido"),
    tipoUsuario: z.enum(["admin", "cont", "aux"]),
    estadoUsuario: z.coerce.boolean().optional(),
    // Persona y campos del subtipo: opcionales (se usan si vienen, si no se aplican defaults).
    persona: personaSchema,
    nivelConfidencialidad: z.string().optional(),
    permisosAdmin: z.string().optional(),
    areaContable: z.string().optional(),
    fechaIngreso: z.coerce.date().optional(),
    tarjetaUsuarioAux: z.coerce.number().optional(),
    estadoUsuarioCont: z.coerce.boolean().optional(),
    estadoUsuarioAux: z.coerce.boolean().optional(),
  }),
});

export const updateUsuarioSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    nombreUsuario: z.string().min(1).optional(),
    correoUsuario: z.string().email().optional(),
    contrasenaUsuario: z.string().min(6).optional(),
    rolUsuario: z.string().optional(),
    estadoUsuario: z.boolean().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});
