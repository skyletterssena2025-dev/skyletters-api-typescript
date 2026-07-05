-- ============================================================================
-- Skyletters - Creacion de la base de datos y el usuario desde cero.
--
-- USAR SOLO si se perdio la base por completo (servidor MySQL vivo, pero sin la
-- base `skyletters_db` o sin el usuario `skyletters`). Ejecutar como ROOT de MySQL:
--
--   mysql -h 192.168.1.27 -u root -p < prisma/init-db.sql
--
-- IMPORTANTE: reemplaza 'TU_PASSWORD' por la misma contrasena que esta en
-- DATABASE_URL dentro de .env (debe coincidir, si no la API no conecta).
--
-- Despues de esto, crear tablas y datos con:  npm run db:setup
-- ============================================================================

CREATE DATABASE IF NOT EXISTS skyletters_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Usuario de la aplicacion (host '%' = accesible desde la red del homelab).
CREATE USER IF NOT EXISTS 'skyletters'@'%' IDENTIFIED BY 'TU_PASSWORD';

GRANT ALL PRIVILEGES ON skyletters_db.* TO 'skyletters'@'%';

FLUSH PRIVILEGES;
