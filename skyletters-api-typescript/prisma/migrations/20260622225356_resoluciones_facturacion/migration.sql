-- CreateTable
CREATE TABLE `resoluciones_facturacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo_documento` VARCHAR(191) NOT NULL,
    `resolucion` VARCHAR(191) NOT NULL,
    `codigo_autorizacion` VARCHAR(191) NULL,
    `prefijo` VARCHAR(191) NULL,
    `numero_inicial` INTEGER NOT NULL,
    `numero_final` INTEGER NOT NULL,
    `vigencia_desde` DATETIME(3) NOT NULL,
    `vigencia_hasta` DATETIME(3) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
