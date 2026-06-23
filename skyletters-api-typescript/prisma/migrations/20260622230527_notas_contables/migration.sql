-- CreateTable
CREATE TABLE `notas_contables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `id_factura` INTEGER NOT NULL,
    `id_cliente` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `motivo` VARCHAR(191) NOT NULL,
    `detalle_producto` TEXT NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `impuesto` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nota_detalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_nota` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precio` DOUBLE NOT NULL,
    `descuento` DOUBLE NOT NULL DEFAULT 0,
    `subtotal` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notas_contables` ADD CONSTRAINT `notas_contables_id_factura_fkey` FOREIGN KEY (`id_factura`) REFERENCES `facturas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notas_contables` ADD CONSTRAINT `notas_contables_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nota_detalles` ADD CONSTRAINT `nota_detalles_id_nota_fkey` FOREIGN KEY (`id_nota`) REFERENCES `notas_contables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
