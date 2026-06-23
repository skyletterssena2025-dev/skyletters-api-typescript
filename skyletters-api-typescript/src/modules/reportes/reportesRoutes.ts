import { Router } from "express";
import { reportesController } from "./reportesController";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import { createReporteSchema, updateReporteSchema, idParamSchema } from "./reportesValidation";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("reportes"));

router.get("/", reportesController.getAll);

// Reportes contables reales (antes de "/:id" para evitar colisión de rutas)
router.get("/estado-cuenta/:idCliente", reportesController.getEstadoCuenta);
router.get("/ventas", reportesController.getVentas);
router.get("/cartera", reportesController.getCartera);

router.get("/:id", validate(idParamSchema), reportesController.getById);
router.post("/", validate(createReporteSchema), reportesController.create);
router.put("/:id", validate(updateReporteSchema), reportesController.update);
router.delete("/:id", validate(idParamSchema), reportesController.delete);

export const reportesRoutes = router;
