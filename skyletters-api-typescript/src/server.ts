import app from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { logger } from "./utils/logger";

const server = app.listen(env.PORT, () => {
  logger.info(`Servidor escuchando en puerto ${env.PORT} (${env.NODE_ENV})`);
});

// Conecta con reintentos. No tumba el servidor si la BD no responde al
// arranque: el monitor interno seguira reintentando y la API se recupera sola.
connectDatabase().then((ok) => {
  if (!ok) logger.warn("API arriba SIN base de datos; reintentando en segundo plano.");
});

const shutdown = async (): Promise<void> => {
  logger.info("Cerrando servidor...");
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);