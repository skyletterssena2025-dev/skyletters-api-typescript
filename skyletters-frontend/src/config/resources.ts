// Configuración declarativa de los módulos CRUD.
// El frontend genera DataTables y formularios a partir de esto, sin código por módulo.

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "reference"
  | "multireference";

export interface SelectOption {
  value: string;
  label: string;
}

export interface ReferenceConfig {
  endpoint: string; // ej. "/clientes"
  valueKey: string; // campo que se envía (ej. "id")
  labelKey: (row: any) => string; // cómo mostrar cada opción
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  optional?: boolean;
  options?: SelectOption[]; // para type "select"
  ref?: ReferenceConfig; // para type "reference"
  hideInTable?: boolean;
  hideInForm?: boolean; // se muestra en la tabla pero no en el formulario (campos calculados)
  section?: string; // agrupa el campo bajo un encabezado en el formulario
}

export interface ResourceConfig {
  key: string; // segmento de ruta y endpoint en /api/v1/<key>
  label: string;
  singular: string;
  icon: string; // clase Font Awesome (ej. "fa-solid fa-percent")
  fields: FieldConfig[];
  readOnly?: boolean; // solo consulta: sin "Nuevo" ni editar/eliminar
  noCreate?: boolean; // permite editar/eliminar pero oculta "Nuevo" (alta por flujo propio)
}

const estadoField = (name: string): FieldConfig => ({
  name,
  label: "Activo",
  type: "boolean",
  optional: true,
  section: "Estado",
});

// Responsabilidades tributarias del tercero (IVA, ReteFuente, ReteICA, ReteIVA…).
const impuestosField = (): FieldConfig => ({
  name: "impuestosAplicables",
  label: "Impuestos / responsabilidades",
  type: "multireference",
  optional: true,
  hideInTable: true,
  section: "Impuestos / responsabilidades",
  ref: {
    endpoint: "/impuestos",
    valueKey: "id",
    labelKey: (i) => `${i.nombre} (${i.porcentaje}%)`,
  },
});

export const RESOURCES: ResourceConfig[] = [
  {
    key: "clientes",
    label: "Clientes",
    singular: "Cliente",
    icon: "fa-solid fa-users",
    fields: [
      { name: "nombreCliente", label: "Nombre", type: "text", section: "Información general" },
      { name: "razonSocial", label: "Razón social", type: "text", section: "Información general" },
      { name: "nitCliente", label: "NIT", type: "text", section: "Información general" },
      { name: "correoCliente", label: "Correo", type: "text", section: "Contacto" },
      { name: "telefonoCliente", label: "Teléfono", type: "text", section: "Contacto" },
      { name: "direccionCliente", label: "Dirección", type: "text", hideInTable: true, section: "Contacto" },
      { name: "ciudadCliente", label: "Ciudad", type: "text", section: "Contacto" },
      estadoField("estadoCliente"),
      impuestosField(),
    ],
  },
  {
    key: "proveedores",
    label: "Proveedores",
    singular: "Proveedor",
    icon: "fa-solid fa-truck",
    fields: [
      { name: "nombreProveedor", label: "Nombre", type: "text", section: "Información general" },
      { name: "razonSocial", label: "Razón social", type: "text", section: "Información general" },
      { name: "nitProveedor", label: "NIT", type: "text", section: "Información general" },
      { name: "correoProveedor", label: "Correo", type: "text", section: "Contacto" },
      { name: "telefonoProveedor", label: "Teléfono", type: "text", section: "Contacto" },
      { name: "direccionProveedor", label: "Dirección", type: "text", hideInTable: true, section: "Contacto" },
      { name: "ciudadProveedor", label: "Ciudad", type: "text", section: "Contacto" },
      estadoField("estadoProveedor"),
      impuestosField(),
    ],
  },
  {
    key: "productos",
    label: "Productos",
    singular: "Producto",
    icon: "fa-solid fa-box",
    fields: [
      { name: "codigoProducto", label: "Código", type: "text" },
      { name: "nombreProducto", label: "Nombre", type: "text" },
      { name: "descripcionProducto", label: "Descripción", type: "text", hideInTable: true },
      { name: "precioProducto", label: "Precio", type: "number" },
      // Stock: solo lectura; lo maneja el kardex (compras suman, ventas restan).
      { name: "cantidadProducto", label: "Stock", type: "number", hideInForm: true },
      estadoField("estadoProducto"),
    ],
  },
  {
    key: "facturas",
    label: "Facturas",
    singular: "Factura",
    icon: "fa-solid fa-file-invoice-dollar",
    fields: [
      { name: "numeroFactura", label: "N° factura", type: "number" },
      {
        name: "idCliente",
        label: "Cliente",
        type: "reference",
        ref: {
          endpoint: "/clientes",
          valueKey: "id",
          labelKey: (c) => `${c.nombreCliente} — ${c.nitCliente}`,
        },
      },
      { name: "fechaFactura", label: "Fecha", type: "date" },
      { name: "detalleProducto", label: "Detalle", type: "text", hideInTable: true },
      { name: "subtotalFactura", label: "Subtotal", type: "number", hideInTable: true },
      { name: "impuestoFactura", label: "Impuesto", type: "number", hideInTable: true },
      { name: "totalFactura", label: "Total", type: "number" },
      { name: "saldoPendiente", label: "Saldo", type: "number" },
      { name: "estado", label: "Estado", type: "text" },
      { name: "formaPago", label: "Forma de pago", type: "text", hideInTable: true },
    ],
  },
  {
    key: "compras",
    label: "Compras",
    singular: "Compra",
    icon: "fa-solid fa-cart-shopping",
    fields: [
      { name: "numeroFactura", label: "N° factura", type: "number", hideInForm: true },
      {
        name: "idProveedor",
        label: "Proveedor",
        type: "reference",
        hideInForm: true,
        ref: {
          endpoint: "/proveedores",
          valueKey: "id",
          labelKey: (p) => `${p.nombreProveedor} — ${p.nitProveedor}`,
        },
      },
      { name: "fechaCompra", label: "Fecha", type: "date", hideInForm: true },
      { name: "subtotal", label: "Subtotal", type: "number", hideInForm: true },
      { name: "impuesto", label: "Impuesto", type: "number", hideInForm: true },
      { name: "total", label: "Total", type: "number", hideInForm: true },
      { name: "estado", label: "Estado", type: "text", hideInForm: true },
    ],
  },
  {
    key: "notas",
    label: "Notas C/D",
    singular: "Nota",
    icon: "fa-solid fa-file-pen",
    fields: [
      { name: "tipo", label: "Tipo", type: "text", hideInForm: true },
      { name: "numero", label: "N°", type: "number", hideInForm: true },
      { name: "fecha", label: "Fecha", type: "date", hideInForm: true },
      { name: "motivo", label: "Motivo", type: "text", hideInForm: true },
      { name: "subtotal", label: "Subtotal", type: "number", hideInForm: true },
      { name: "total", label: "Total", type: "number", hideInForm: true },
    ],
  },
  {
    key: "inventario",
    label: "Kardex",
    singular: "Movimiento",
    icon: "fa-solid fa-boxes-stacked",
    readOnly: true,
    fields: [
      { name: "codigoProducto", label: "Código", type: "text" },
      { name: "productoNombre", label: "Producto", type: "text" },
      { name: "tipo", label: "Tipo", type: "text" },
      { name: "cantidad", label: "Cantidad", type: "number" },
      { name: "saldoResultante", label: "Saldo", type: "number" },
      { name: "motivo", label: "Motivo", type: "text" },
      { name: "fecha", label: "Fecha", type: "date" },
    ],
  },
  {
    key: "usuarios",
    label: "Usuarios",
    singular: "Usuario",
    icon: "fa-solid fa-user-gear",
    // Edicion y bloqueo desde la UI; el alta tiene flujo propio (persona + tipo).
    noCreate: true,
    fields: [
      { name: "nombreUsuario", label: "Nombre", type: "text" },
      { name: "correoUsuario", label: "Correo", type: "text" },
      {
        name: "rolUsuario",
        label: "Rol",
        type: "reference",
        ref: {
          endpoint: "/roles",
          valueKey: "nombre",
          labelKey: (r: any) => r.nombre,
        },
      },
      { name: "tipoUsuario", label: "Tipo", type: "text", hideInForm: true },
      { name: "estadoUsuario", label: "Activo", type: "boolean", optional: true },
    ],
  },
  {
    key: "impuestos",
    label: "Impuestos",
    singular: "Impuesto",
    icon: "fa-solid fa-percent",
    fields: [
      { name: "nombre", label: "Nombre", type: "text" },
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        options: [
          { value: "venta", label: "IVA / suma (venta)" },
          { value: "retencion", label: "Retención sobre subtotal" },
          { value: "retencion_iva", label: "Retención sobre IVA (ReteIVA)" },
          { value: "compra", label: "Compra" },
        ],
      },
      { name: "porcentaje", label: "Porcentaje (%)", type: "number" },
      { name: "fechaInicio", label: "Fecha inicio", type: "date" },
      { name: "fechaFin", label: "Fecha fin", type: "date" },
      { name: "baseImponible", label: "Base mínima retención", type: "number" },
    ],
  },
  {
    key: "conciliacion",
    label: "Conciliación",
    singular: "Conciliación bancaria",
    icon: "fa-solid fa-scale-balanced",
    fields: [
      { name: "cuentaBancaria", label: "Cuenta bancaria", type: "text" },
      { name: "banco", label: "Banco", type: "text" },
      { name: "periodoInicio", label: "Periodo inicio", type: "date" },
      { name: "periodoFin", label: "Periodo fin", type: "date" },
      { name: "movimientosConciliados", label: "Movimientos", type: "number", optional: true },
      { name: "saldoBancario", label: "Saldo bancario", type: "number" },
      { name: "saldoContable", label: "Saldo contable", type: "number" },
    ],
  },
  {
    key: "reportes",
    label: "Reportes",
    singular: "Reporte financiero",
    icon: "fa-solid fa-chart-line",
    fields: [
      { name: "tipo", label: "Tipo", type: "text" },
      {
        name: "formato",
        label: "Formato",
        type: "select",
        options: [
          { value: "PDF", label: "PDF" },
          { value: "EXCEL", label: "Excel" },
          { value: "CSV", label: "CSV" },
        ],
      },
      { name: "movimientoContable", label: "Movimiento contable", type: "text" },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "periodoInicio", label: "Periodo inicio", type: "date" },
      { name: "periodoFin", label: "Periodo fin", type: "date" },
    ],
  },
  {
    key: "asientos",
    label: "Asientos",
    singular: "Asiento contable",
    icon: "fa-solid fa-book",
    // Libro diario: los asientos se generan automaticamente (partida doble) desde
    // facturas, notas, compras y pagos. Solo consulta desde la UI.
    readOnly: true,
    fields: [
      { name: "tipoOrigen", label: "Origen", type: "text" },
      { name: "numeroFactura", label: "N° doc.", type: "number" },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "totalDebito", label: "Débito", type: "number" },
      { name: "totalCredito", label: "Crédito", type: "number" },
      { name: "fechaCreacionRegistro", label: "Fecha", type: "date" },
      { name: "usuarioCreador", label: "Usuario", type: "text", hideInTable: true },
      { name: "listaMovimiContable", label: "Movimientos", type: "text", hideInTable: true },
    ],
  },
  {
    key: "cuentas",
    label: "Plan de cuentas",
    singular: "Cuenta contable (PUC)",
    icon: "fa-solid fa-list-ol",
    fields: [
      { name: "codigo", label: "Código", type: "text" },
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "clase", label: "Clase", type: "number", optional: true },
      {
        name: "naturaleza",
        label: "Naturaleza",
        type: "select",
        options: [
          { value: "DEBITO", label: "Débito" },
          { value: "CREDITO", label: "Crédito" },
        ],
      },
      { name: "aceptaMovimiento", label: "Acepta movimiento", type: "boolean", optional: true },
      estadoField("estado"),
    ],
  },
  {
    key: "parametrizacion",
    label: "Parametrización",
    singular: "Parametrización del sistema",
    icon: "fa-solid fa-gear",
    fields: [
      { name: "nombreEmpresa", label: "Empresa", type: "text" },
      { name: "emailEmpresa", label: "Email", type: "text" },
      { name: "telefonoEmpresa", label: "Teléfono", type: "text" },
      { name: "direccionEmpresa", label: "Dirección", type: "text", hideInTable: true },
      { name: "anioInicialEmpresa", label: "Año inicial", type: "number" },
      {
        name: "tipoMoneda",
        label: "Moneda",
        type: "select",
        options: [
          { value: "COP", label: "COP" },
          { value: "USD", label: "USD" },
          { value: "EUR", label: "EUR" },
        ],
      },
      { name: "documentoContable", label: "Documento", type: "text" },
      { name: "manejaImpuesto", label: "Maneja impuesto", type: "boolean", optional: true },
      { name: "impuestos", label: "N° impuestos", type: "number", optional: true },
      { name: "cuentasContables", label: "Cuentas contables", type: "number", optional: true },
    ],
  },
  {
    key: "resoluciones",
    label: "Resoluciones",
    singular: "Resolución DIAN",
    icon: "fa-solid fa-stamp",
    fields: [
      {
        name: "tipoDocumento",
        label: "Tipo de documento",
        type: "select",
        options: [
          { value: "FACTURA_VENTA", label: "Factura de venta" },
          { value: "NOTA_CREDITO", label: "Nota crédito" },
          { value: "NOTA_DEBITO", label: "Nota débito" },
        ],
        section: "Documento",
      },
      { name: "resolucion", label: "N° resolución DIAN", type: "text", section: "Documento" },
      { name: "codigoAutorizacion", label: "Código de autorización", type: "text", optional: true, section: "Documento" },
      { name: "prefijo", label: "Prefijo", type: "text", optional: true, section: "Numeración" },
      { name: "numeroInicial", label: "N° inicial", type: "number", section: "Numeración" },
      { name: "numeroFinal", label: "N° final", type: "number", section: "Numeración" },
      { name: "vigenciaDesde", label: "Vigencia desde", type: "date", section: "Vigencia" },
      { name: "vigenciaHasta", label: "Vigencia hasta", type: "date", section: "Vigencia" },
      estadoField("estado"),
      { name: "proximoNumero", label: "Próximo N°", type: "number", hideInForm: true },
      { name: "disponibles", label: "Disponibles", type: "number", hideInForm: true },
    ],
  },
  {
    key: "roles",
    label: "Roles",
    singular: "Rol y permisos",
    icon: "fa-solid fa-user-shield",
    fields: [
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "descripcion", label: "Descripción", type: "text" },
      {
        name: "listaPermisos",
        label: "Permisos",
        type: "multireference",
        ref: {
          endpoint: "/roles/permisos",
          valueKey: "key",
          labelKey: (p: any) => `${p.label} (${p.key})`,
        },
        hideInTable: true,
      },
      { name: "listaRol", label: "Alias de rol (coma)", type: "text", hideInTable: true },
    ],
  },
];

export function findResource(key: string | undefined): ResourceConfig | undefined {
  return RESOURCES.find((r) => r.key === key);
}
