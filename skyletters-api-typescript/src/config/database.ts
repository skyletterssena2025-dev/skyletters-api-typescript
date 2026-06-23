import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

let conectada = false;
let monitorActivo = false;

/**
 * Conecta a la base de datos reintentando con backoff exponencial.
 * NO lanza si se agotan los reintentos: deja el proceso vivo para que el
 * monitor siga intentando reconectar (la API no debe morir si el homelab
 * pierde red temporalmente).
 */
export async function connectDatabase(maxRetries = 10, baseDelayMs = 1000): Promise<boolean> {
  for (let intento = 1; intento <= maxRetries; intento++) {
    try {
      await prisma.$connect();
      // Ping real para confirmar que el motor responde.
      await prisma.$queryRaw`SELECT 1`;
      conectada = true;
      logger.info("Base de datos conectada correctamente");
      iniciarMonitor();
      return true;
    } catch (error) {
      const delay = Math.min(baseDelayMs * 2 ** (intento - 1), 30000);
      logger.error(
        `Error al conectar la base de datos (intento ${intento}/${maxRetries}). Reintentando en ${delay}ms`,
        error instanceof Error ? error.message : error,
      );
      if (intento < maxRetries) await sleep(delay);
    }
  }
  logger.error("No se pudo conectar tras varios intentos. El monitor seguira reintentando.");
  iniciarMonitor();
  return false;
}

/**
 * Monitor en segundo plano: hace ping periodico y reconecta si la BD cae.
 * Asi la API se recupera sola cuando el homelab vuelve a estar en red.
 */
function iniciarMonitor(intervalMs = 15000): void {
  if (monitorActivo) return;
  monitorActivo = true;
  const timer = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      if (!conectada) {
        conectada = true;
        logger.info("Conexion con la base de datos restablecida");
      }
    } catch {
      if (conectada) {
        conectada = false;
        logger.error("Se perdio la conexion con la base de datos. Reintentando reconectar...");
      }
      try {
        await prisma.$connect();
      } catch {
        // Se reintenta en el siguiente tick.
      }
    }
  }, intervalMs);
  // No mantener vivo el proceso solo por el monitor.
  timer.unref?.();
}

export function isDatabaseConnected(): boolean {
  return conectada;
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  conectada = false;
  logger.info("Base de datos desconectada");
}
