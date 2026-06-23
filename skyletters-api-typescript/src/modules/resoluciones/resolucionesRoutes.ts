import { Router } from "express";
import { resolucionesController } from "./resolucionesController";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import {
  createResolucionSchema,
  updateResolucionSchema,
  idParamSchema,
} from "./resolucionesValidation";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("resoluciones"));

router.get("/", resolucionesController.getAll);
router.get("/:id", validate(idParamSchema), resolucionesController.getById);
router.post("/", validate(createResolucionSchema), resolucionesController.create);
router.put("/:id", validate(updateResolucionSchema), resolucionesController.update);
router.delete("/:id", validate(idParamSchema), resolucionesController.delete);

export const resolucionesRoutes = router;
