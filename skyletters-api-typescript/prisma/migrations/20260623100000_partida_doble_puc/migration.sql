-- AlterTable
ALTER TABLE `asientos_contables` ADD COLUMN `id_origen` INTEGER NULL,
    ADD COLUMN `tipo_origen` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `total_credito` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `total_debito` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `movimientos_contables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_asiento` INTEGER NOT NULL,
    `codigo_cuenta` VARCHAR(191) NOT NULL,
    `nombre_cuenta` VARCHAR(191) NOT NULL,
    `debito` DOUBLE NOT NULL DEFAULT 0,
    `credito` DOUBLE NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cuentas_puc` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `clase` INTEGER NOT NULL,
    `naturaleza` VARCHAR(191) NOT NULL,
    `acepta_movimiento` BOOLEAN NOT NULL DEFAULT true,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cuentas_puc_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `asientos_contables_tipo_origen_id_origen_key` ON `asientos_contables`(`tipo_origen`, `id_origen`);

-- AddForeignKey
ALTER TABLE `movimientos_contables` ADD CONSTRAINT `movimientos_contables_id_asiento_fkey` FOREIGN KEY (`id_asiento`) REFERENCES `asientos_contables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

