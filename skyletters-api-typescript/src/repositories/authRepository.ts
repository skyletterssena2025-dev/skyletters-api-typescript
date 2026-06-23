import { prisma } from "../config/database";
import type { Usuario } from "@prisma/client";

export const authRepository = {
  async findByEmail(correoUsuario: string): Promise<Usuario | null> {
    // No se filtra por estado aqui: el authService distingue "credenciales
    // invalidas" de "usuario bloqueado" para dar un mensaje claro.
    return prisma.usuario.findUnique({
      where: { correoUsuario },
    });
  },

  async findById(id: number): Promise<Usuario | null> {
    return prisma.usuario.findUnique({
      where: { id, estadoUsuario: true },
    });
  },
};
