-- CreateTable
CREATE TABLE `factura_detalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_factura` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precio` DOUBLE NOT NULL,
    `descuento` DOUBLE NOT NULL DEFAULT 0,
    `subtotal` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `factura_detalles` ADD CONSTRAINT `factura_detalles_id_factura_fkey` FOREIGN KEY (`id_factura`) REFERENCES `facturas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
