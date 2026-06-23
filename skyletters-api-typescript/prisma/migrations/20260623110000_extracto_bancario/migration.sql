-- CreateTable
CREATE TABLE `movimientos_bancarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_conciliacion` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `referencia` VARCHAR(191) NULL,
    `valor` DOUBLE NOT NULL,
    `conciliado` BOOLEAN NOT NULL DEFAULT false,
    `id_mov_contable` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `movimientos_bancarios` ADD CONSTRAINT `movimientos_bancarios_id_conciliacion_fkey` FOREIGN KEY (`id_conciliacion`) REFERENCES `conciliacion_bancaria`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

