// Cuentas del PUC (Colombia) que usa el motor de partida doble para mapear
// documentos (facturas, notas, pagos, compras) a movimientos contables.
// Los codigos siguen el Decreto 2650 (PUC comercial). Se siembran en CuentaPUC.

export interface CuentaRef {
  codigo: string;
  nombre: string;
}

export const CUENTAS = {
  // --- Activo ---
  CAJA: { codigo: "110505", nombre: "Caja general" },
  BANCOS: { codigo: "111005", nombre: "Bancos - cuenta corriente" },
  CLIENTES: { codigo: "130505", nombre: "Clientes nacionales" },
  ANTICIPO_RETEFUENTE: { codigo: "135515", nombre: "Retencion en la fuente (anticipo)" },
  ANTICIPO_RETEIVA: { codigo: "135517", nombre: "Impuesto a las ventas retenido (anticipo)" },
  ANTICIPO_RETEICA: { codigo: "135518", nombre: "Retencion de ICA (anticipo)" },
  INVENTARIO: { codigo: "143501", nombre: "Mercancias no fabricadas por la empresa" },
  IVA_DESCONTABLE: { codigo: "240810", nombre: "IVA descontable" },

  // --- Pasivo ---
  PROVEEDORES: { codigo: "220505", nombre: "Proveedores nacionales" },
  IVA_GENERADO: { codigo: "240805", nombre: "IVA generado" },
  RETEFUENTE_PORPAGAR: { codigo: "236505", nombre: "Retencion en la fuente por pagar" },
  RETEIVA_PORPAGAR: { codigo: "236701", nombre: "IVA retenido por pagar" },
  RETEICA_PORPAGAR: { codigo: "236805", nombre: "Retencion de ICA por pagar" },

  // --- Ingresos / Costos ---
  INGRESOS_VENTAS: { codigo: "413595", nombre: "Comercio al por mayor y al por menor" },
  DEVOLUCIONES_VENTAS: { codigo: "417505", nombre: "Devoluciones en ventas" },
} satisfies Record<string, CuentaRef>;

// Catalogo completo a sembrar en el PUC (incluye cuentas mayores para contexto).
export const PUC_SEED: Array<{ codigo: string; nombre: string; clase: number; naturaleza: "DEBITO" | "CREDITO"; aceptaMovimiento: boolean }> = [
  // Clase 1 - Activo
  { codigo: "11", nombre: "Disponible", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: false },
  { codigo: "1105", nombre: "Caja", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: false },
  { codigo: "110505", nombre: "Caja general", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: true },
  { codigo: "1110", nombre: "Bancos", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: false },
  { codigo: "111005", nombre: "Bancos - cuenta corriente", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: true },
  { codigo: "13", nombre: "Deudores", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: false },
  { codigo: "1305", nombre: "Clientes", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: false },
  { codigo: "130505", nombre: "Clientes nacionales", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: true },
  { codigo: "1355", nombre: "Anticipo de impuestos y contribuciones", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: false },
  { codigo: "135515", nombre: "Retencion en la fuente (anticipo)", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: true },
  { codigo: "135517", nombre: "Impuesto a las ventas retenido (anticipo)", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: true },
  { codigo: "135518", nombre: "Retencion de ICA (anticipo)", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: true },
  { codigo: "14", nombre: "Inventarios", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: false },
  { codigo: "1435", nombre: "Mercancias no fabricadas por la empresa", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: false },
  { codigo: "143501", nombre: "Mercancias no fabricadas por la empresa", clase: 1, naturaleza: "DEBITO", aceptaMovimiento: true },

  // Clase 2 - Pasivo
  { codigo: "22", nombre: "Proveedores", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: false },
  { codigo: "2205", nombre: "Proveedores nacionales", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: false },
  { codigo: "220505", nombre: "Proveedores nacionales", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: true },
  { codigo: "24", nombre: "Impuestos, gravamenes y tasas", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: false },
  { codigo: "2408", nombre: "Impuesto sobre las ventas por pagar", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: false },
  { codigo: "240805", nombre: "IVA generado", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: true },
  { codigo: "240810", nombre: "IVA descontable", clase: 2, naturaleza: "DEBITO", aceptaMovimiento: true },
  { codigo: "2365", nombre: "Retencion en la fuente", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: false },
  { codigo: "236505", nombre: "Retencion en la fuente por pagar", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: true },
  { codigo: "2367", nombre: "Impuesto a las ventas retenido", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: false },
  { codigo: "236701", nombre: "IVA retenido por pagar", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: true },
  { codigo: "2368", nombre: "Impuesto de industria y comercio retenido", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: false },
  { codigo: "236805", nombre: "Retencion de ICA por pagar", clase: 2, naturaleza: "CREDITO", aceptaMovimiento: true },

  // Clase 4 - Ingresos
  { codigo: "41", nombre: "Operacionales", clase: 4, naturaleza: "CREDITO", aceptaMovimiento: false },
  { codigo: "4135", nombre: "Comercio al por mayor y al por menor", clase: 4, naturaleza: "CREDITO", aceptaMovimiento: false },
  { codigo: "413595", nombre: "Comercio al por mayor y al por menor", clase: 4, naturaleza: "CREDITO", aceptaMovimiento: true },
  { codigo: "4175", nombre: "Devoluciones en ventas (DB)", clase: 4, naturaleza: "DEBITO", aceptaMovimiento: false },
  { codigo: "417505", nombre: "Devoluciones en ventas", clase: 4, naturaleza: "DEBITO", aceptaMovimiento: true },
];
