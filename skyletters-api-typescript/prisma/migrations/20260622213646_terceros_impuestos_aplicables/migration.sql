-- AlterTable
ALTER TABLE `clientes` ADD COLUMN `impuestos_aplicables` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `proveedores` ADD COLUMN `impuestos_aplicables` VARCHAR(191) NOT NULL DEFAULT '';
