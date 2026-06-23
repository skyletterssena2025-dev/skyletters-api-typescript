-- detalle_producto ahora es TEXT (guarda el JSON del desglose de impuestos/ítems)
ALTER TABLE `facturas` MODIFY `detalle_producto` TEXT NOT NULL;
