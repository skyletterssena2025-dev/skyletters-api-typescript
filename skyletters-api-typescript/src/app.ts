import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { corsOptions } from "./config/cors";
import { rateLimiter } from "./config/rateLimit";
import { env } from "./config/env";
import { swaggerDocument } from "./config/swagger";
import { errorHandler } from "./middlewares/errorHandler";
import { authRoutes } from "./modules/auth/authRoutes";
import { usuariosRoutes } from "./modules/usuarios/usuariosRoutes";
import { rolesRoutes } from "./modules/roles/rolesRoutes";
import { parametrizacionRoutes } from "./modules/parametrizacion/parametrizacionRoutes";
import { asientosRoutes } from "./modules/asientos/asientosRoutes";
import { reportesRoutes } from "./modules/reportes/reportesRoutes";
import { personasRoutes } from './modules/personas/personasRoutes';
import { clientesRoutes } from './modules/clientes/clientesRoutes';
import { proveedoresRoutes } from "./modules/proveedores/proveedoresRoutes";
import { productosRoutes } from "./modules/productos/productosRoutes";
import { impuestosRoutes } from "./modules/impuestos/impuestosRoutes";
import { conciliacionRoutes } from "./modules/conciliacion/conciliacionRoutes";
import { facturasRoutes } from "./modules/facturas/facturasRoutes";
import { resolucionesRoutes } from "./modules/resoluciones/resolucionesRoutes";
import { notasRoutes } from "./modules/notas/notasRoutes";
import { pagosRoutes } from "./modules/pagos/pagosRoutes";
import { inventarioRoutes } from "./modules/inventario/inventarioRoutes";
import { comprasRoutes } from "./modules/compras/comprasRoutes";
import { cuentasRoutes } from "./modules/cuentas/cuentasRoutes";

const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(rateLimiter);

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "OK", timestamp: new Date().toUTCString() });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(`${env.API_PREFIX}/auth`, authRoutes);
app.use(`${env.API_PREFIX}/usuarios`, usuariosRoutes);
app.use(`${env.API_PREFIX}/roles`, rolesRoutes);
app.use(`${env.API_PREFIX}/parametrizacion`, parametrizacionRoutes);
app.use(`${env.API_PREFIX}/asientos`, asientosRoutes);
app.use(`${env.API_PREFIX}/reportes`, reportesRoutes);
app.use(`${env.API_PREFIX}/personas`, personasRoutes);
app.use(`${env.API_PREFIX}/clientes`, clientesRoutes);
app.use(`${env.API_PREFIX}/proveedores`, proveedoresRoutes);
app.use(`${env.API_PREFIX}/productos`, productosRoutes);
app.use(`${env.API_PREFIX}/impuestos`, impuestosRoutes);
app.use(`${env.API_PREFIX}/conciliacion`, conciliacionRoutes);
app.use(`${env.API_PREFIX}/facturas`, facturasRoutes);
app.use(`${env.API_PREFIX}/resoluciones`, resolucionesRoutes);
app.use(`${env.API_PREFIX}/notas`, notasRoutes);
app.use(`${env.API_PREFIX}/pagos`, pagosRoutes);
app.use(`${env.API_PREFIX}/inventario`, inventarioRoutes);
app.use(`${env.API_PREFIX}/compras`, comprasRoutes);
app.use(`${env.API_PREFIX}/cuentas`, cuentasRoutes);

app.use(errorHandler);

export default app;

