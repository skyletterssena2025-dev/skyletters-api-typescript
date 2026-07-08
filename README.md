# Skyletters

Este es mi sistema contable y de facturacion para Colombia (DIAN). Lo organice como un monorepo con dos subproyectos:

- **[skyletters-api-typescript/](skyletters-api-typescript/README.md)** — mi API REST (Node.js + TypeScript + Express + Prisma + MySQL).
- **[skyletters-frontend/](skyletters-frontend/README.md)** — mi SPA (React + TypeScript + Vite + Material UI).

En cada subproyecto dejo su propio `README.md` con el detalle de arquitectura, modulos y endpoints. Este archivo es mi guia rapida del repositorio.

## Stack tecnologico

**Backend** (`skyletters-api-typescript/`):

- **Framework:** [Express](https://expressjs.com/) (Node.js + TypeScript)
- **ORM:** [Prisma](https://www.prisma.io/) sobre MySQL 8
- Librerias de soporte: `zod` (validacion), `jsonwebtoken` + `bcryptjs` (auth), `winston` (logging), `swagger-ui-express` (docs), `express-rate-limit`, `cors`

**Frontend** (`skyletters-frontend/`):

- **Libreria de UI:** [React](https://react.dev/) — no es un framework, es una libreria de componentes; el resto del stack (routing, build) lo aporto yo con piezas separadas.
- **Empaquetador/dev server:** [Vite](https://vite.dev/)
- **Framework de componentes UI:** [Material UI](https://mui.com/) (`@mui/material`, `@mui/x-data-grid`)
- **Routing:** `react-router-dom`
- Lenguaje: TypeScript

## Funcionalidad

Lo que cubro con el sistema:

- Maestros: clientes, proveedores, productos, inventario (kardex).
- Documentos: facturas de venta, compras, notas credito/debito.
- Cartera (CxC): abonos, saldos y estados (PENDIENTE / PARCIAL / PAGADA).
- Impuestos DIAN: IVA, retenciones y ReteIVA, que recalculo en el servidor.
- Resoluciones DIAN: numeracion por tipo de documento con rango y vigencia.
- **Contabilidad de partida doble automatica**: manejo un Plan Unico de Cuentas (PUC) y genero asientos balanceados desde factura, nota, compra y pago.
- **Conciliacion bancaria real**: cargo el extracto y lo cruzo automaticamente contra el libro.
- **RBAC**: defino roles y un catalogo de permisos por modulo, y puedo bloquear usuarios.
- Reportes (ventas, cartera, estado de cuenta) y un dashboard con graficas.

Dejo fuera de alcance la facturacion electronica DIAN real (CUFE/transmision); por ahora la facturacion es impresion/PDF local.

## Estructura

```
skyletters/
├── skyletters-api-typescript/   # Backend (API REST)
├── skyletters-frontend/         # Frontend (SPA)
└── README.md                    # Este archivo
```

## Puesta en marcha

Necesito Node.js >= 18 y una base MySQL 8 accesible.

### 1. Base de datos

Uso MySQL 8 con la base `skyletters_db`. La cadena de conexion la pongo en `skyletters-api-typescript/.env` (`DATABASE_URL`).

### 2. Backend (API)

```bash
cd skyletters-api-typescript
npm install
cp .env.example .env            # edito DATABASE_URL y mis secretos JWT
npm run db:setup                # crea tablas (db push) + seed + contabiliza (todo en uno)
PORT=3100 npm run start         # IMPORTANTE: uso 3100 (el 3000 suele estar ocupado)
```

Con `npm run db:setup` encadeno: `prisma generate` + `prisma db push` (crea todas las tablas desde `schema.prisma`) + `prisma:seed` (datos) + `backfill:contabilidad`. Es idempotente, asi que lo puedo re-ejecutar.

### Recrear la base desde cero (recuperacion)

Si pierdo la base de datos:

1. **Si solo pierdo el contenido pero la base y el usuario siguen** -> me basta con `npm run db:setup`.
2. **Si pierdo la base o el usuario por completo** -> primero los recreo como ROOT de MySQL (una sola vez) y luego corro `db:setup`:

   ```bash
   # edito la contrasena dentro del archivo para que coincida con mi .env
   mysql -h 192.168.1.27 -u root -p < prisma/init-db.sql
   npm run db:setup
   ```

   Mi `prisma/init-db.sql` crea la base `skyletters_db`, el usuario `skyletters` y sus permisos. `prisma db push` tambien crea la base si no existe y el usuario tiene permiso de creacion.

### 3. Frontend (SPA)

```bash
cd skyletters-frontend
npm install
npm run dev                     # http://localhost:5173
```

Configuro `VITE_API_URL=http://localhost:3100/api/v1` en `skyletters-frontend/.env`. El origen 5173 ya lo tengo permitido en el CORS de la API.

## Credenciales del seed

- Administrador: `admin@skyletters.com` / `Admin123!`
- Usuarios Cliente (demo): `Cliente123!`

## Notas

- En local levanto la API en el puerto **3100** (el 3000 suele estar ocupado).
- No versiono los archivos `.env` (los tengo en `.gitignore`).
- Mi convencion: sin emojis; en la UI uso Font Awesome 6.

## Licencia

ISC
