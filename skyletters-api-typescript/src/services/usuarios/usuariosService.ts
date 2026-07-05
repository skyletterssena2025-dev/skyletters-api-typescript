import bcrypt from "bcryptjs";
import { usuariosRepository } from "../../repositories/usuariosRepository";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import type { Usuario } from "@prisma/client";

const SALT_ROUNDS = 10;

// Datos opcionales de la persona asociada.
export interface PersonaInput {
  nombrePersona: string;
  apellidoPersona: string;
  correoPersona?: string;
  direccionPersona?: string;
  telefonoPersona?: string;
  generoPersona?: string;
  fechaNacimientoPersona?: string;
}

// Entrada de creacion: nucleo requerido + persona y campos de subtipo opcionales.
export interface CreateUsuarioInput {
  nombreUsuario: string;
  correoUsuario: string;
  contrasenaUsuario: string;
  rolUsuario: string;
  tipoUsuario: "admin" | "cont" | "aux";
  estadoUsuario?: boolean;
  persona?: PersonaInput;
  nivelConfidencialidad?: string;
  permisosAdmin?: string;
  areaContable?: string;
  fechaIngreso?: Date;
  tarjetaUsuarioAux?: number;
  estadoUsuarioCont?: boolean;
  estadoUsuarioAux?: boolean;
}

export const usuariosService = {
  async getAll(): Promise<Omit<Usuario, "contrasenaUsuario">[]> {
    const list = await usuariosRepository.findAll();
    return list.map(({ contrasenaUsuario: _, ...u }) => u);
  },

  async getById(id: number): Promise<Omit<Usuario, "contrasenaUsuario"> | null> {
    const u = await usuariosRepository.findById(id);
    if (!u) return null;
    const { contrasenaUsuario: _, ...safe } = u;
    return safe;
  },

  async create(input: CreateUsuarioInput): Promise<Omit<Usuario, "contrasenaUsuario">> {
    const existing = await usuariosRepository.findByEmail(input.correoUsuario);
    if (existing) throw AppError.conflict("El correo ya está registrado");
    const hash = await bcrypt.hash(input.contrasenaUsuario, SALT_ROUNDS);
    const usuario = await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: {
          nombreUsuario: input.nombreUsuario,
          correoUsuario: input.correoUsuario,
          contrasenaUsuario: hash,
          rolUsuario: input.rolUsuario,
          estadoUsuario: input.estadoUsuario ?? true,
          tipoUsuario: input.tipoUsuario,
        },
      });
      // Persona: solo si se envian sus datos (es opcional).
      if (input.persona?.nombrePersona) {
        await tx.persona.create({
          data: {
            idUsuario: u.id,
            nombrePersona: input.persona.nombrePersona,
            apellidoPersona: input.persona.apellidoPersona,
            correoPersona: input.persona.correoPersona ?? input.correoUsuario,
            direccionPersona: input.persona.direccionPersona ?? "",
            telefonoPersona: input.persona.telefonoPersona ?? "",
            generoPersona: input.persona.generoPersona ?? "",
            fechaNacimientoPersona: input.persona.fechaNacimientoPersona ?? "",
          },
        });
      }
      // Subtipo segun tipoUsuario, con defaults si no se envian los campos.
      const hoy = new Date();
      if (input.tipoUsuario === "admin") {
        await tx.usuarioAdmin.create({
          data: {
            idUsuario: u.id,
            nivelConfidencialidad: input.nivelConfidencialidad ?? "medio",
            permisosAdmin: input.permisosAdmin ?? "",
          },
        });
      } else if (input.tipoUsuario === "cont") {
        await tx.usuarioCont.create({
          data: {
            idUsuario: u.id,
            areaContable: input.areaContable ?? "General",
            fechaIngreso: input.fechaIngreso ?? hoy,
            estadoUsuarioCont: input.estadoUsuarioCont ?? true,
          },
        });
      } else if (input.tipoUsuario === "aux") {
        await tx.usuarioAux.create({
          data: {
            idUsuario: u.id,
            areaContable: input.areaContable ?? "General",
            fechaIngreso: input.fechaIngreso ?? hoy,
            tarjetaUsuarioAux: input.tarjetaUsuarioAux ?? 0,
            estadoUsuarioAux: input.estadoUsuarioAux ?? true,
          },
        });
      }
      return u;
    });
    const { contrasenaUsuario: _, ...safe } = usuario;
    return safe;
  },

  async update(
    id: number,
    data: Partial<{
      nombreUsuario: string;
      correoUsuario: string;
      contrasenaUsuario: string;
      rolUsuario: string;
      estadoUsuario: boolean;
    }>
  ): Promise<Omit<Usuario, "contrasenaUsuario">> {
    const u = await usuariosRepository.findById(id);
    if (!u) throw AppError.notFound("Usuario no encontrado");
    if (data.correoUsuario && data.correoUsuario !== u.correoUsuario) {
      const existing = await usuariosRepository.findByEmail(data.correoUsuario);
      if (existing) throw AppError.conflict("El correo ya está en uso");
    }
    const updateData = { ...data };
    if (data.contrasenaUsuario) {
      updateData.contrasenaUsuario = await bcrypt.hash(data.contrasenaUsuario, SALT_ROUNDS);
    }
    const updated = await usuariosRepository.update(id, updateData);
    const { contrasenaUsuario: _, ...safe } = updated;
    return safe;
  },

  async delete(id: number): Promise<void> {
    const u = await usuariosRepository.findById(id);
    if (!u) throw AppError.notFound("Usuario no encontrado");
    await usuariosRepository.delete(id);
  },
};
