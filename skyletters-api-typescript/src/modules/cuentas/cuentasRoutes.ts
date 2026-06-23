import { Router } from "express";
import { cuentasController } from "./cuentasController";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import { createCuentaSchema, updateCuentaSchema, idParamSchema } from "./cuentasValidation";

const router = Router();

router.use(authMiddleware);
// El Plan de Cuentas es parte de la contabilidad: se protege con el permiso "asientos".
router.use(requireRole("asientos"));

router.get("/", cuentasController.getAll);
router.get("/:id", validate(idParamSchema), cuentasController.getById);
router.post("/", validate(createCuentaSchema), cuentasController.create);
router.put("/:id", validate(updateCuentaSchema), cuentasController.update);
router.delete("/:id", validate(idParamSchema), cuentasController.delete);

export const cuentasRoutes = router;
