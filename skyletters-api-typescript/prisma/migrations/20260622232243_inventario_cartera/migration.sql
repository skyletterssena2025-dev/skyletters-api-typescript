-- DropForeignKey
ALTER TABLE `facturas` DROP FOREIGN KEY `facturas_id_cliente_fkey`;

-- DropIndex
DROP INDEX `facturas_id_cliente_fkey` ON `facturas`;

-- AlterTable
ALTER TABLE `facturas` ADD COLUMN `estado` VARCHAR(191) NOT NULL DEFAULT 'PENDIENTE',
    ADD COLUMN `saldo_pendiente` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `pagos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_factura` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `monto` DOUBLE NOT NULL,
    `forma_pago` VARCHAR(191) NOT NULL,
    `nota` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos_inventario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_producto` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `saldo_resultante` INTEGER NOT NULL,
    `motivo` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `facturas` ADD CONSTRAINT `facturas_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_id_factura_fkey` FOREIGN KEY (`id_factura`) REFERENCES `facturas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `movimientos_inventario_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `productos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
