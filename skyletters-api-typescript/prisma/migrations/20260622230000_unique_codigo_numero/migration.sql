-- Unicidad de código de producto y número de factura
ALTER TABLE `productos` ADD UNIQUE INDEX `productos_codigo_producto_key`(`codigo_producto`);
ALTER TABLE `facturas` ADD UNIQUE INDEX `facturas_numero_factura_key`(`numero_factura`);
