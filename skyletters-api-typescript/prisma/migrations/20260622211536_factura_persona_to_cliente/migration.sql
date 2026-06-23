/*
  Warnings:

  - You are about to drop the column `id_persona` on the `facturas` table. All the data in the column will be lost.
  - Added the required column `id_cliente` to the `facturas` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `facturas` DROP FOREIGN KEY `facturas_id_persona_fkey`;

-- DropIndex
DROP INDEX `facturas_id_persona_fkey` ON `facturas`;

-- AlterTable
ALTER TABLE `facturas` DROP COLUMN `id_persona`,
    ADD COLUMN `id_cliente` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `facturas` ADD CONSTRAINT `facturas_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
