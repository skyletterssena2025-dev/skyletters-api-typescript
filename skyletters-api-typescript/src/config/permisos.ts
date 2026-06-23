/**
 * Catalogo canonico de permisos del sistema. Cada permiso corresponde a un
 * modulo/capacidad y es el string que `requireRole(...)` valida en las rutas.
 * Es la unica fuente de verdad: lo consume el endpoint GET /roles/permisos y,
 * en el front, el formulario de roles para elegir permisos (en vez de texto libre).
 */
export interface PermisoCatalogo {
  key: string;
  label: string;
  grupo: string;
}

export const PERMISOS: PermisoCatalogo[] = [
  // Maestros
  { key: "clientes", label: "Clientes", grupo: "Maestros" },
  { key: "proveedores", label: "Proveedores", grupo: "Maestros" },
  { key: "productos", label: "Productos", grupo: "Maestros" },
  { key: "inventario", label: "Inventario (kardex)", grupo: "Maestros" },
  // Documentos
  { key: "facturas", label: "Facturas de venta", grupo: "Documentos" },
  { key: "compras", label: "Compras", grupo: "Documentos" },
  { key: "notas", label: "Notas credito/debito", grupo: "Documentos" },
  { key: "pagos", label: "Pagos / abonos", grupo: "Documentos" },
  // Contable
  { key: "asientos", label: "Asientos y plan de cuentas", grupo: "Contable" },
  { key: "impuestos", label: "Impuestos", grupo: "Contable" },
  { key: "conciliacion", label: "Conciliacion bancaria", grupo: "Contable" },
  { key: "reportes", label: "Reportes", grupo: "Contable" },
  // Configuracion
  { key: "parametrizacion", label: "Parametrizacion", grupo: "Configuracion" },
  { key: "resoluciones", label: "Resoluciones DIAN", grupo: "Configuracion" },
  { key: "roles", label: "Roles y permisos", grupo: "Configuracion" },
  { key: "usuarios", label: "Usuarios", grupo: "Configuracion" },
];

/** Lista de keys de permiso. */
export const PERMISO_KEYS: string[] = PERMISOS.map((p) => p.key);

/** Todos los permisos en formato CSV (para el rol Administrador). */
export const ALL_PERMISOS_CSV: string = PERMISO_KEYS.join(",");
