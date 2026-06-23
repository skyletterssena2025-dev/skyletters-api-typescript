# Skyletters API

API REST de un sistema contable / de facturacion para Colombia. Node.js + TypeScript + Express + Prisma sobre MySQL. Cubre el ciclo comercial: terceros (clientes/proveedores), inventario, facturacion de venta y compra con impuestos DIAN, notas credito/debito, cartera (cuentas por cobrar), resoluciones de facturacion y reportes financieros. Incluye contabilidad de partida doble automatica (PUC), conciliacion bancaria real y control de acceso por roles/permisos (RBAC).

## Stack

- Node.js >= 18 + TypeScript (modo strict)
- Express.js (framework HTTP)
- Prisma ORM sobre MySQL 8
- Zod (validacion de requests)
- JWT con refresh tokens (autenticacion)
- bcryptjs (hash de contrasenas)
- Winston (logger)
- Jest + ts-jest (pruebas)
- Swagger UI (documentacion interactiva en `/api-docs`)

## Arquitectura por capas

El flujo de una peticion es: `routes -> middlewares -> controllers -> services -> repositories -> Prisma`.

```
src/
  app.ts                  Configuracion de Express: CORS, rate limit, montaje de rutas, errorHandler
  server.ts               Punto de entrada: conexion DB y arranque del servidor
  config/
    env.ts                Variables de entorno validadas con Zod
    database.ts           Cliente Prisma (singleton)
    cors.ts               Origenes permitidos
    rateLimit.ts          Limite de peticiones
    swagger.ts            Documento OpenAPI
  middlewares/
    auth.ts               authMiddleware (JWT) + AuthRequest + optionalAuth
    roles.ts              requireRole(permiso) con match EXACTO de rol
    validate.ts           Validacion Zod (body/params/query)
    errorHandler.ts       Manejo central: AppError, ZodError (mensaje por campo), errores Prisma (P2002/P2003/P2025)
  utils/
    AppError.ts           Error HTTP tipado (badRequest, notFound, conflict, etc.)
    logger.ts             Winston
  modules/<modulo>/       Por modulo: <modulo>Controller.ts, <modulo>Routes.ts, <modulo>Validation.ts
  services/<modulo>/      Logica de negocio
  repositories/           Acceso a datos (Prisma) por entidad
prisma/
  schema.prisma           Modelos y relaciones
  migrations/             Migraciones versionadas
  seed.ts                 Datos iniciales (admin, terceros, impuestos, resoluciones, etc.)
```

Cada capa tiene una responsabilidad: las rutas declaran endpoints y middlewares; los controllers traducen HTTP a llamadas de servicio y arman la respuesta `{ success, data }`; los services contienen la logica (recalculo de impuestos, inventario, cartera); los repositories encapsulan Prisma.

## Requisitos

- Node.js >= 18
- MySQL 8.x (el proyecto usa un contenedor MySQL; ver `DATABASE_URL`)

## Instalacion y ejecucion

```bash
npm install
cp .env.example .env          # editar credenciales
npm run prisma:generate
npm run prisma:migrate        # o prisma migrate deploy en despliegue
npm run prisma:seed           # datos iniciales (opcional)
npm run dev                   # desarrollo (recarga automatica)
```

Credenciales del seed: `admin@skyletters.com` / `Admin123!`.

Nota de entorno local: en la maquina de desarrollo el puerto 3000 esta ocupado por otra app, por lo que la API se levanta en 3100: `PORT=3100 npm run start`.

## Scripts

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor en desarrollo (ts-node-dev) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run start` | Ejecuta `dist/server.js` |
| `npm test` | Pruebas con Jest |
| `npm run lint` | ESLint sobre `src/` |
| `npm run prisma:generate` | Genera el cliente Prisma |
| `npm run prisma:migrate` | Aplica migraciones en desarrollo |
| `npm run prisma:seed` | Ejecuta el seed |
| `npm run prisma:studio` | Abre Prisma Studio |
| `npm run backfill:contabilidad` | Genera asientos de los documentos existentes, normaliza cartera y poda huerfanos (idempotente) |

## Variables de entorno

| Variable | Descripcion |
|----------|-------------|
| `NODE_ENV` | development / production |
| `PORT` | Puerto HTTP (3000 por defecto; usar 3100 en local) |
| `API_PREFIX` | Prefijo base (`/api/v1`) |
| `DATABASE_URL` | Cadena MySQL (`mysql://user:pass@host:3306/skyletters_db`) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Claves de firma (>= 16 caracteres) |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Vigencia de tokens |
| `CORS_ORIGINS` | Origenes permitidos separados por coma |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | Limite de peticiones |
| `LOG_LEVEL` | Nivel de log de Winston |

## Convenciones

- Respuesta estandar: `{ "success": boolean, "data": ... }` o `{ "success": false, "message": "..." }`.
- Todas las rutas (salvo auth) requieren `Authorization: Bearer <accessToken>`.
- Errores de validacion Zod devuelven 400 con un mensaje legible por campo y el objeto `errors`.
- Violaciones de unicidad Prisma devuelven 409 con mensaje claro; violaciones de llave foranea 400.

## Modulos y endpoints

Prefijo base: `/api/v1`.

### Autenticacion (publico)
- `POST /auth/login` { correoUsuario, contrasenaUsuario }
- `POST /auth/refresh` { refreshToken }
- `POST /auth/logout`

### Maestros
- `usuarios` GET/POST/PUT/DELETE (permiso `usuarios`). El login rechaza usuarios bloqueados (`estadoUsuario = false`) con 403; el bloqueo/desbloqueo se hace con `PUT /usuarios/:id { estadoUsuario }`. No se permite que un usuario se bloquee a si mismo.
- `roles` GET/POST/PUT/DELETE (permiso `roles`) y `GET /roles/permisos` (catalogo canonico de permisos del sistema). `requireRole` usa match exacto contra el `nombre` del rol o sus alias en `listaRol`.
- `clientes` GET/POST/PUT/DELETE. Borrado logico (estadoCliente=false). Campo `impuestosAplicables` (CSV de ids de Impuesto = responsabilidades tributarias del tercero).
- `proveedores` GET/POST/PUT/DELETE. Borrado logico (estadoProveedor=false). Mismo `impuestosAplicables`.
- `productos` GET/POST/PUT/DELETE. `codigoProducto` unico. `cantidadProducto` es el stock real (lo mueven facturas y compras).
- `inventario` GET. Kardex: lista de `MovimientoInventario` (solo lectura) con el nombre del producto aplanado.

### Documentos
- `facturas` GET/POST/PUT/DELETE, `GET /facturas/next-number` (siguiente consecutivo segun la resolucion activa).
  - Al crear: recalcula totales en el servidor, valida que el numero este dentro del rango y la vigencia de la resolucion DIAN, descuenta inventario (SALIDA en kardex), nace en estado PENDIENTE con `saldoPendiente = total`.
- `compras` GET/POST/PUT/DELETE. Factura de compra a proveedor: el IVA es descontable; suma inventario (ENTRADA en kardex). El numero lo provee el proveedor.
- `notas` GET/POST/PUT/DELETE, `GET /notas/next-number?tipo=CREDITO|DEBITO`. Notas credito/debito ligadas a una factura origen; numeracion por su resolucion. La nota credito (devolucion) reingresa inventario.
- `asientos` GET/POST/PUT/DELETE (permiso `asientos`). Libro diario. Los asientos se generan AUTOMATICAMENTE por partida doble desde factura, nota, compra y pago (ver "Logica de negocio"). Tambien admite asientos MANUALES con movimientos debito/credito que se validan (debitos = creditos). Los asientos de origen documento no se editan/eliminan a mano.
- `cuentas` GET/POST/PUT/DELETE (permiso `asientos`). Plan Unico de Cuentas (PUC Colombia). Catalogo de cuentas contables usado por el motor de partida doble; se siembra con un PUC base.

### Cartera
- `pagos` GET (filtro `?idFactura`), POST (registrar abono), DELETE (permiso `pagos`). Al registrar un abono se descuenta del `saldoPendiente` de la factura y se actualiza el estado (PENDIENTE / PARCIAL / PAGADA), todo en una transaccion que tambien genera el asiento contable del abono. Borrar un abono revierte el saldo, recalcula el estado y elimina su asiento.

### Contable / impuestos / reportes
- `impuestos` GET/POST/PUT/DELETE. Tipos: `venta` (IVA, suma), `retencion` (resta, con base minima), `retencion_iva` (ReteIVA sobre el IVA). Validacion: porcentaje 0-100, base no negativa, fechaFin >= fechaInicio.
- `conciliacion` GET/POST/PUT/DELETE (permiso `conciliacion`). Conciliacion bancaria real:
  - `POST /conciliacion/:id/extracto` { movimientos: [{ fecha, descripcion, referencia?, valor }] } carga (reemplaza) las lineas del extracto. `valor` positivo = ingreso, negativo = egreso.
  - `POST /conciliacion/:id/conciliar` cruza automaticamente cada linea del extracto con los movimientos contables de las cuentas de banco (PUC clase 11) del periodo, por igualdad de valor; marca los cruces y actualiza saldos.
  - `GET /conciliacion/:id/detalle` devuelve extracto y libro (conciliados/pendientes) con totales y la diferencia (partidas conciliatorias).
- `reportes` GET/POST/PUT/DELETE (CRUD de metadatos) y reportes reales:
  - `GET /reportes/cartera` total pendiente agrupado por cliente.
  - `GET /reportes/ventas?desde=&fin=` totales de ventas en el periodo.
  - `GET /reportes/estado-cuenta/:idCliente` facturas y saldos del cliente.
- `parametrizacion` GET/POST/PUT/DELETE, `GET /parametrizacion/current`. Datos de la empresa emisora.
- `resoluciones` GET/POST/PUT/DELETE. Resolucion DIAN por tipo de documento (FACTURA_VENTA, NOTA_CREDITO, NOTA_DEBITO) con rango, codigo de autorizacion y vigencia. El GET enriquece cada resolucion con `proximoNumero`, `usados` y `disponibles`.

## Logica de negocio clave

### Motor de impuestos (recalculo en el servidor)
`computeTotals` (en `facturasService`, replicado en `notasService` y `comprasService`) recalcula SIEMPRE los totales a partir de los detalles y de los impuestos del tercero; ignora los totales enviados por el cliente. Reglas:
- Subtotal = suma de `cantidad * precio * (1 - descuento/100)` por linea.
- Impuestos tipo `venta` (IVA): suman; acumulan el IVA total.
- Impuestos tipo `retencion`: restan sobre el subtotal, solo si el subtotal alcanza la base minima (`baseImponible`).
- Impuestos tipo `retencion_iva` (ReteIVA): restan sobre el IVA total.
- `impuestoNeto = suma(IVA) - suma(retenciones)`; `total = subtotal + impuestoNeto`.

### Inventario (kardex)
Las facturas de venta crean movimientos SALIDA y descuentan stock (con validacion de existencias). Las compras crean movimientos ENTRADA y suman stock. Las notas credito reingresan stock. Cada movimiento guarda el saldo resultante.

### Cartera
Cada factura nace PENDIENTE con `saldoPendiente = total`. Los abonos (modulo `pagos`) reducen el saldo y mueven el estado: sin saldo -> PAGADA; saldo = total -> PENDIENTE; en medio -> PARCIAL.

### Resoluciones DIAN
Cada tipo de documento tiene su propia resolucion con rango y vigencia. La creacion de factura valida el numero contra ese rango y la vigencia.

### Partida doble automatica (`src/services/partidaDoble/`)
Cada documento genera un asiento contable BALANCEADO e idempotente (uno por documento, llave `tipoOrigen + idOrigen`):
- Factura de venta: debita Clientes (1305) y los anticipos de retencion (1355x); acredita Ingresos (4135) e IVA generado (2408).
- Nota credito: reversa la venta; nota debito: mismo sentido que la factura.
- Compra: debita Inventario (1435) e IVA descontable (2408x); acredita Proveedores (2205) y retenciones por pagar (2365/2367/2368).
- Pago/abono: debita Caja/Bancos (1105/1110) y acredita Clientes (1305).

El desglose de impuestos se toma del documento; para documentos legados sin desglose se sintetiza desde el neto (total - subtotal). Todo asiento valida que debitos = creditos. `npm run backfill:contabilidad` contabiliza los documentos existentes, normaliza la cartera y poda asientos huerfanos (idempotente).

### Conciliacion bancaria
Se carga el extracto del banco y se cruza automaticamente por valor contra los movimientos contables de las cuentas de banco (PUC clase 11) del periodo. Lo no cruzado queda como partida conciliatoria y se reporta la diferencia entre saldo bancario y saldo del libro.

### RBAC y permisos
`src/config/permisos.ts` es el catalogo canonico de permisos (uno por modulo). TODAS las rutas de modulo se protegen con `requireRole("<key>")`; `GET /roles/permisos` expone el catalogo (lo consume el formulario de roles del front). El rol Administrador trae todos los permisos.

### Resiliencia de base de datos
`connectDatabase` reintenta con backoff exponencial y un monitor en segundo plano reconecta si la BD cae; la API no termina el proceso si la BD no responde al arranque.

## Modelos principales (Prisma)

- Usuario (+ UsuarioAdmin/Cont/Aux), RefreshToken, SesionUsuario, RolesYPermisos
- Persona, Cliente, Proveedor, Producto
- Factura, FacturaDetalle, Pago
- Compra, CompraDetalle
- NotaContable, NotaDetalle
- MovimientoInventario (kardex)
- Impuesto, AsientoContable, MovimientoContable, CuentaPUC (plan de cuentas)
- ConciliacionBancaria, MovimientoBancario (lineas de extracto), ReporteFinanciero
- ParametrizacionSistema, ResolucionFacturacion

Ver `prisma/schema.prisma` para campos y relaciones.

## Pruebas

`npm test` ejecuta la suite de Jest (controladores de auth, middleware y proveedores con mocks del servicio).

## Pendientes conocidos

- Facturacion electronica DIAN real (CUFE, transmision): FUERA DE ALCANCE por decision del proyecto; requiere certificado y ambiente DIAN externos. La facturacion queda como impresion/PDF.
- Deuda menor: las 4 facturas del seed nacen con `saldoPendiente = 0`; se corrigen con `npm run backfill:contabilidad`.

Ya implementado (antes pendiente): partida doble automatica con PUC, conciliacion bancaria real (carga de extracto + cruce) y RBAC con catalogo de permisos.

## Licencia

ISC
