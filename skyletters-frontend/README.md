# Skyletters Frontend

Aplicacion web (SPA) del sistema contable Skyletters. React + TypeScript + Vite, con Material UI (DataGrid) para tablas y un sistema de modulos declarativo (config-driven) que genera la mayoria de las pantallas CRUD a partir de una sola configuracion. Consume la API REST de Skyletters. Incluye dashboard con graficas, libro diario de partida doble, conciliacion bancaria y gestion de roles/permisos y usuarios (editar/bloquear).

## Stack

- React 18 + TypeScript (strict)
- Vite (dev server y build)
- React Router v6 (ruteo y rutas protegidas)
- Material UI: `@mui/x-data-grid` (tablas), `@mui/material` (Autocomplete, tema)
- Font Awesome 6 (iconos; no se usan emojis)
- `fetch` nativo (sin axios) con manejo de token JWT y refresh automatico

## Requisitos

- Node.js >= 18
- La API corriendo. En desarrollo local la API se levanta en el puerto 3100:
  `cd ../skyletters-api-typescript && PORT=3100 npm run start`

## Ejecucion

```bash
npm install
npm run dev        # http://localhost:5173
```

Credenciales por defecto (seed de la API): `admin@skyletters.com` / `Admin123!`.

`.env`:
```
VITE_API_URL=http://localhost:3100/api/v1
```

## Scripts

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Typecheck (tsc) + build de produccion a `dist/` |
| `npm run preview` | Sirve el build de produccion |

## Arquitectura

```
src/
  main.tsx                Bootstrap de React
  App.tsx                 Proveedores (tema, toast, auth), router y rutas
  index.css               Sistema de estilos: variables de tema (oscuro/claro), componentes
  theme.ts                Tema MUI dinamico (oscuro por defecto, claro estilo Siigo)
  theme/
    ThemeModeContext.tsx  Contexto del interruptor de tema (persistido en localStorage)
  api/
    client.ts             Cliente HTTP: token JWT, refresh, ApiError con errores por campo
  auth/
    AuthContext.tsx       Estado de sesion (login/logout)
  config/
    resources.ts          Definicion declarativa de cada modulo (campos, tipos, secciones)
  components/
    Layout.tsx            Sidebar agrupado por secciones, avatar, interruptor de tema
    ProtectedRoute.tsx    Proteccion de rutas por sesion
    DataTable.tsx         Tabla generica sobre MUI DataGrid (busqueda, orden, paginacion)
    Modal.tsx             Modal accesible (ESC, foco, ARIA)
    FormField.tsx         Render de campo por tipo (text/number/date/boolean/select/reference/multireference)
    ResourceForm.tsx      Formulario generico por secciones a partir de la config
    FacturaForm.tsx       Formulario de factura (lineas, impuestos, totales, numeracion)
    CompraForm.tsx        Formulario de factura de compra a proveedor
    NotaForm.tsx          Formulario de nota credito/debito
    InvoicePreview.tsx    Vista previa e impresion (PDF) de factura
    NotaPreview.tsx       Vista previa e impresion (PDF) de nota
    PagoModal.tsx         Registro de abonos (cartera)
    EstadoCuentaModal.tsx Estado de cuenta por cliente
    AsientoView.tsx       Visor de asiento contable (movimientos debito/credito + cuadre)
    ConciliacionDetalle.tsx Conciliacion bancaria: carga de extracto + cruce + resultado
    ReportsView.tsx       Reportes reales (ventas por periodo, cartera)
    charts/Charts.tsx     Graficas SVG sin dependencias (barras, dona) para el dashboard
    ConfirmDialog.tsx     Confirmacion de borrado
    Toast.tsx             Notificaciones (exito/error/info)
  pages/
    LoginPage.tsx         Inicio de sesion (dos paneles)
    DashboardPage.tsx     KPIs financieros + accesos rapidos
    ResourcePage.tsx      Pagina generica por modulo (tabla + form + acciones)
```

## Sistema de modulos declarativo (config-driven)

La mayoria de las pantallas no tienen codigo propio: se generan desde `src/config/resources.ts`. Cada modulo define:

```ts
{
  key: "clientes",          // segmento de ruta y endpoint /api/v1/clientes
  label: "Clientes",
  singular: "Cliente",
  icon: "fa-solid fa-users",
  readOnly: false,          // si true, sin Nuevo/editar/eliminar
  noCreate: false,          // si true, permite editar/eliminar pero oculta "Nuevo" (p. ej. usuarios)
  fields: [
    { name: "correoCliente", label: "Correo", type: "text", section: "Contacto" },
    { name: "estadoCliente", label: "Activo", type: "boolean" },
    // ...
  ],
}
```

Tipos de campo soportados por `FormField`: `text`, `number`, `date`, `boolean` (interruptor), `select` (opciones fijas), `reference` (dropdown poblado por un endpoint) y `multireference` (chips multi-seleccion). Opciones de campo: `optional`, `hideInTable`, `hideInForm`, `section`.

`ResourcePage` lee la config, hace `GET /<key>` para la tabla, construye las columnas del `DataTable`, y abre `ResourceForm` para crear/editar. Los modulos con formularios complejos (facturas, compras, notas) se atienden con componentes propios; reportes se atiende con `ReportsView`.

## Cliente API (`api/client.ts`)

- Guarda `accessToken`, `refreshToken` y el usuario en `localStorage`.
- Agrega `Authorization: Bearer <token>` a cada peticion.
- Si una peticion devuelve 401, intenta refrescar el token una vez y reintenta.
- Desempaqueta la respuesta `{ success, data }` y devuelve `data`.
- En error lanza `ApiError` con `status` y, si el backend los envia, los `fields` (errores de validacion por campo) que `ResourceForm` pinta en rojo sobre cada input.

## Documentos con formulario propio

- Factura (`FacturaForm`): selecciona cliente, agrega articulos (autocomplete de producto), descuentos por linea, calcula subtotal/IVA/retenciones/total en vivo, toma el siguiente numero del backend. Persiste `idProducto` por linea para el inventario.
- Compra (`CompraForm`): igual pero contra un proveedor; el IVA es descontable y el numero lo provee el proveedor.
- Nota credito/debito (`NotaForm`): referencia una factura origen, toma el cliente y sus impuestos de esa factura, motivo y numeracion por tipo.
- Vista previa / PDF (`InvoicePreview`, `NotaPreview`): documento imprimible con encabezado de empresa, cliente, lineas, desglose de impuestos, total y pie con la resolucion DIAN. La impresion abre una ventana con estilos propios para guardar como PDF.

## Cartera y reportes

- `PagoModal`: registra abonos contra una factura (POST `/pagos`) y muestra el historial; el saldo y el estado se actualizan en el backend.
- `EstadoCuentaModal`: estado de cuenta por cliente (`/reportes/estado-cuenta/:id`).
- `ReportsView` (menu Reportes): ventas por periodo (`/reportes/ventas`) y cartera por cobrar (`/reportes/cartera`).
- `DashboardPage`: KPIs de ventas del anio y cartera pendiente, graficas (ventas por mes, estado de cartera en dona, ventas vs compras) y accesos rapidos a los modulos.

## Contabilidad, conciliacion y usuarios

- Plan de cuentas (`cuentas`, menu Contable): CRUD del PUC con el formulario generico.
- Asientos (`asientos`): libro diario en solo lectura; los asientos los genera la API por partida doble desde los documentos. El boton de ver abre `AsientoView` con los movimientos debito/credito y el indicador de cuadre.
- Conciliacion (`conciliacion`): el boton "Conciliar" abre `ConciliacionDetalle`, que carga las lineas del extracto, ejecuta el cruce contra el libro y muestra conciliados/pendientes y la diferencia.
- Usuarios (`usuarios`, `noCreate`): se editan y se bloquean/desbloquean (candado) desde la tabla; el rol se elige de un dropdown de roles. El alta de usuarios tiene flujo propio (persona + tipo) y no usa el form generico.
- Roles (`roles`): el campo de permisos es un multiselect poblado por `GET /roles/permisos` (catalogo del backend), no texto libre.

## Tema

El tema vive en variables CSS (`:root` oscuro por defecto, `:root[data-theme="light"]` claro estilo Siigo) y un tema MUI dinamico (`theme.ts`). El interruptor del sidebar alterna ambos y persiste la preferencia. La interfaz usa iconos Font Awesome; no se usan emojis.

## Notas

- La API debe estar accesible en `VITE_API_URL`. El origen `http://localhost:5173` ya esta permitido por el CORS de la API.
- El modulo `personas` no tiene pantalla porque la API solo expone `POST` (sin listado).
