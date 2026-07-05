# Skyletters API

Esta es mi API REST de un sistema contable / de facturacion para Colombia. La construi con Node.js + TypeScript + Express + Prisma sobre MySQL. Con ella cubro el ciclo comercial: terceros (clientes/proveedores), inventario, facturacion de venta y compra con impuestos DIAN, notas credito/debito, cartera (cuentas por cobrar), resoluciones de facturacion y reportes financieros. Ademas incluyo contabilidad de partida doble automatica (PUC), conciliacion bancaria real y control de acceso por roles/permisos (RBAC).

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

Mi flujo para una peticion es: `routes -> middlewares -> controllers -> services -> repositories -> Prisma`.

```
src/
  app.ts                  Configuracion de Express: CORS, rate limit, montaje de rutas, errorHandler
  server.ts               Punto de entrada: conexion DB y arranque del servidor
  config/
    env.ts                Variables de entorno validadas con Zod
    database.ts           Cliente Prisma (singleton) + reconexion resiliente
    cors.ts               Origenes permitidos
    rateLimit.ts          Limite de peticiones
    swagger.ts            Documento OpenAPI
    permisos.ts           Catalogo canonico de permisos (RBAC)
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
  services/partidaDoble/  Motor de partida doble (PUC + generacion de asientos)
  repositories/           Acceso a datos (Prisma) por entidad
prisma/
  schema.prisma           Modelos y relaciones
  migrations/             Migraciones versionadas
  seed.ts                 Datos iniciales (admin, terceros, impuestos, PUC, resoluciones, etc.)
  backfill-contabilidad.ts  Contabiliza documentos existentes y normaliza cartera
  init-db.sql             Crea la base y el usuario desde cero (recuperacion)
```

A cada capa le doy una responsabilidad: las rutas declaran endpoints y middlewares; los controllers traducen HTTP a llamadas de servicio y arman la respuesta `{ success, data }`; los services contienen mi logica (recalculo de impuestos, inventario, cartera, partida doble); los repositories encapsulan Prisma.

## Requisitos

- Node.js >= 18
- MySQL 8.x (uso un contenedor MySQL; ver `DATABASE_URL`)

## Instalacion y ejecucion

```bash
npm install
cp .env.example .env          # edito mis credenciales y secretos JWT
npm run db:setup              # crea tablas (db push) + seed + contabiliza, todo en uno
PORT=3100 npm run start       # levanto la API (uso 3100; ver nota de entorno)
```

`npm run db:setup` me crea las tablas (db push), corre el seed y contabiliza; es idempotente, asi que lo re-ejecuto sin problema. Para desarrollo con recarga uso `npm run dev`.

Recuperacion desde cero: si pierdo la base o el usuario por completo, los recreo como ROOT con `mysql -h <host> -u root -p < prisma/init-db.sql` (ajusto la contrasena para que coincida con `.env`) y luego corro `npm run db:setup`.

Credenciales del seed: `admin@skyletters.com` / `Admin123!`.

Nota de entorno local: en mi maquina el puerto 3000 esta ocupado por otra app, asi que levanto la API en 3100: `PORT=3100 npm run start`.

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
| `npm run db:push` | Crea/sincroniza las tablas desde `schema.prisma` (sin historial de migraciones) |
| `npm run db:setup` | Bootstrap completo: `generate` + `db push` + `seed` + `backfill` (idempotente) |

## Variables de entorno

| Variable | Descripcion |
|----------|-------------|
| `NODE_ENV` | development / production |
| `PORT` | Puerto HTTP (3000 por defecto; uso 3100 en local) |
| `API_PREFIX` | Prefijo base (`/api/v1`) |
| `DATABASE_URL` | Cadena MySQL (`mysql://user:pass@host:3306/skyletters_db`) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Claves de firma (>= 16 caracteres) |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Vigencia de tokens |
| `CORS_ORIGINS` | Origenes permitidos separados por coma |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | Limite de peticiones |
| `LOG_LEVEL` | Nivel de log de Winston |

## Convenciones

- Uso una respuesta estandar: `{ "success": boolean, "data": ... }` o `{ "success": false, "message": "..." }`.
- Pido `Authorization: Bearer <accessToken>` en todas las rutas (salvo auth).
- Devuelvo 400 en errores de validacion Zod, con un mensaje legible por campo y el objeto `errors`.
- Devuelvo 409 en violaciones de unicidad Prisma y 400 en violaciones de llave foranea.

## Modulos y endpoints

Prefijo base: `/api/v1`.

### Autenticacion (publico)
- `POST /auth/login` { correoUsuario, contrasenaUsuario }
- `POST /auth/refresh` { refreshToken }
- `POST /auth/logout`

### Maestros
- `usuarios` GET/POST/PUT/DELETE (permiso `usuarios`). En el login rechazo a los usuarios bloqueados (`estadoUsuario = false`) con 403; el bloqueo/desbloqueo lo hago con `PUT /usuarios/:id { estadoUsuario }`. No dejo que un usuario se bloquee a si mismo.
- `roles` GET/POST/PUT/DELETE (permiso `roles`) y `GET /roles/permisos` (catalogo canonico de permisos). `requireRole` hace match exacto contra el `nombre` del rol o sus alias en `listaRol`.
- `clientes` GET/POST/PUT/DELETE. Borrado logico (estadoCliente=false). Campo `impuestosAplicables` (CSV de ids de Impuesto = responsabilidades tributarias del tercero).
- `proveedores` GET/POST/PUT/DELETE. Borrado logico (estadoProveedor=false). Mismo `impuestosAplicables`.
- `productos` GET/POST/PUT/DELETE. `codigoProducto` unico. `cantidadProducto` es el stock real (lo mueven facturas y compras).
- `inventario` GET. Kardex: lista de `MovimientoInventario` (solo lectura) con el nombre del producto aplanado.

### Documentos
- `facturas` GET/POST/PUT/DELETE, `GET /facturas/next-number` (siguiente consecutivo segun la resolucion activa).
  - Al crear: recalculo totales en el servidor, valido que el numero este dentro del rango y la vigencia de la resolucion DIAN, descuento inventario (SALIDA en kardex) y la dejo en estado PENDIENTE con `saldoPendiente = total`.
- `compras` GET/POST/PUT/DELETE. Factura de compra a proveedor: el IVA es descontable; sumo inventario (ENTRADA en kardex). El numero lo provee el proveedor.
- `notas` GET/POST/PUT/DELETE, `GET /notas/next-number?tipo=CREDITO|DEBITO`. Notas credito/debito ligadas a una factura origen; numeracion por su resolucion. La nota credito (devolucion) reingresa inventario.
- `asientos` GET/POST/PUT/DELETE (permiso `asientos`). Libro diario. Genero los asientos AUTOMATICAMENTE por partida doble desde factura, nota, compra y pago (ver "Logica de negocio"). Tambien admito asientos MANUALES con movimientos debito/credito que valido (debitos = creditos). Los asientos de origen documento no se editan/eliminan a mano.
- `cuentas` GET/POST/PUT/DELETE (permiso `asientos`). Plan Unico de Cuentas (PUC Colombia). Es el catalogo de cuentas que usa mi motor de partida doble; lo siembro con un PUC base.

### Cartera
- `pagos` GET (filtro `?idFactura`), POST (registrar abono), DELETE (permiso `pagos`). Al registrar un abono descuento del `saldoPendiente` de la factura y actualizo el estado (PENDIENTE / PARCIAL / PAGADA), todo en una transaccion que tambien genera el asiento contable del abono. Al borrar un abono revierto el saldo, recalculo el estado y elimino su asiento.

### Contable / impuestos / reportes
- `impuestos` GET/POST/PUT/DELETE. Tipos: `venta` (IVA, suma), `retencion` (resta, con base minima), `retencion_iva` (ReteIVA sobre el IVA). Validacion: porcentaje 0-100, base no negativa, fechaFin >= fechaInicio.
- `conciliacion` GET/POST/PUT/DELETE (permiso `conciliacion`). Conciliacion bancaria real:
  - `POST /conciliacion/:id/extracto` { movimientos: [{ fecha, descripcion, referencia?, valor }] } carga (reemplaza) las lineas del extracto. `valor` positivo = ingreso, negativo = egreso.
  - `POST /conciliacion/:id/conciliar` cruza cada linea del extracto con los movimientos contables de las cuentas de banco (PUC clase 11) del periodo, por igualdad de valor; marca los cruces y actualiza saldos.
  - `GET /conciliacion/:id/detalle` devuelve extracto y libro (conciliados/pendientes) con totales y la diferencia (partidas conciliatorias).
- `reportes` GET/POST/PUT/DELETE (CRUD de metadatos) y reportes reales:
  - `GET /reportes/cartera` total pendiente agrupado por cliente.
  - `GET /reportes/ventas?desde=&fin=` totales de ventas en el periodo.
  - `GET /reportes/estado-cuenta/:idCliente` facturas y saldos del cliente.
- `parametrizacion` GET/POST/PUT/DELETE, `GET /parametrizacion/current`. Datos de la empresa emisora.
- `resoluciones` GET/POST/PUT/DELETE. Resolucion DIAN por tipo de documento (FACTURA_VENTA, NOTA_CREDITO, NOTA_DEBITO) con rango, codigo de autorizacion y vigencia. El GET enriquece cada resolucion con `proximoNumero`, `usados` y `disponibles`.

## Logica de negocio clave

### Motor de impuestos (recalculo en el servidor)
En `computeTotals` (en `facturasService`, replicado en `notasService` y `comprasService`) recalculo SIEMPRE los totales a partir de los detalles y de los impuestos del tercero; ignoro los totales enviados por el cliente. Mis reglas:
- Subtotal = suma de `cantidad * precio * (1 - descuento/100)` por linea.
- Impuestos tipo `venta` (IVA): suman; acumulan el IVA total.
- Impuestos tipo `retencion`: restan sobre el subtotal, solo si el subtotal alcanza la base minima (`baseImponible`).
- Impuestos tipo `retencion_iva` (ReteIVA): restan sobre el IVA total.
- `impuestoNeto = suma(IVA) - suma(retenciones)`; `total = subtotal + impuestoNeto`.

### Inventario (kardex)
Las facturas de venta crean movimientos SALIDA y descuentan stock (valido existencias). Las compras crean movimientos ENTRADA y suman stock. Las notas credito reingresan stock. En cada movimiento guardo el saldo resultante.

### Cartera
Cada factura nace PENDIENTE con `saldoPendiente = total`. Los abonos (modulo `pagos`) reducen el saldo y mueven el estado: sin saldo -> PAGADA; saldo = total -> PENDIENTE; en medio -> PARCIAL.

### Resoluciones DIAN
Cada tipo de documento tiene su propia resolucion con rango y vigencia. Al crear una factura valido el numero contra ese rango y la vigencia.

### Partida doble automatica (`src/services/partidaDoble/`)
Por cada documento genero un asiento contable BALANCEADO e idempotente (uno por documento, llave `tipoOrigen + idOrigen`):
- Factura de venta: debito Clientes (1305) y los anticipos de retencion (1355x); acredito Ingresos (4135) e IVA generado (2408).
- Nota credito: reverso la venta; nota debito: mismo sentido que la factura.
- Compra: debito Inventario (1435) e IVA descontable (2408x); acredito Proveedores (2205) y retenciones por pagar (2365/2367/2368).
- Pago/abono: debito Caja/Bancos (1105/1110) y acredito Clientes (1305).

El desglose de impuestos lo tomo del documento; para documentos legados sin desglose lo sintetizo desde el neto (total - subtotal). En todo asiento valido que debitos = creditos. Con `npm run backfill:contabilidad` contabilizo los documentos existentes, normalizo la cartera y podo asientos huerfanos (idempotente).

### Conciliacion bancaria
Cargo el extracto del banco y lo cruzo por valor contra los movimientos contables de las cuentas de banco (PUC clase 11) del periodo. Lo que no cruza lo dejo como partida conciliatoria y reporto la diferencia entre el saldo bancario y el del libro.

### RBAC y permisos
En `src/config/permisos.ts` defino el catalogo canonico de permisos (uno por modulo). Protejo TODAS las rutas de modulo con `requireRole("<key>")`; expongo el catalogo en `GET /roles/permisos` (lo consume el formulario de roles del front). Al rol Administrador le doy todos los permisos.

### Resiliencia de base de datos
En `connectDatabase` reintento con backoff exponencial y dejo un monitor en segundo plano que reconecta si la BD cae; no termino el proceso si la BD no responde al arranque.

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

Para los campos y relaciones reviso `prisma/schema.prisma`.

## Pruebas

Con `npm test` ejecuto mi suite de Jest (controladores de auth, middleware y proveedores con mocks del servicio).

## Pendientes conocidos

- Facturacion electronica DIAN real (CUFE, transmision): la dejo FUERA DE ALCANCE; requiere certificado y ambiente DIAN externos. La facturacion la mantengo como impresion/PDF.
- Deuda menor: las 4 facturas del seed nacen con `saldoPendiente = 0`; las corrijo con `npm run backfill:contabilidad`.

Ya lo implemente (antes pendiente): partida doble automatica con PUC, conciliacion bancaria real (carga de extracto + cruce) y RBAC con catalogo de permisos.

## Licencia

ISC
