import { Router } from "express";
import { conciliacionController } from "./conciliacionController";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import {
  createConciliacionSchema,
  updateConciliacionSchema,
  cargarExtractoSchema,
  idParamSchema,
} from "./conciliacionValidation";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("conciliacion"));

router.get("/", conciliacionController.getAll);
// Rutas de conciliacion real (antes de "/:id" para evitar colision).
router.get("/:id/detalle", validate(idParamSchema), conciliacionController.getDetalle);
router.post("/:id/extracto", validate(cargarExtractoSchema), conciliacionController.cargarExtracto);
router.post("/:id/conciliar", validate(idParamSchema), conciliacionController.conciliar);
router.get("/:id", validate(idParamSchema), conciliacionController.getById);
router.post("/", validate(createConciliacionSchema), conciliacionController.create);
router.put("/:id", validate(updateConciliacionSchema), conciliacionController.update);
router.delete("/:id", validate(idParamSchema), conciliacionController.delete);

export const conciliacionRoutes = router;
