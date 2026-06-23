import { Router } from "express";
import { facturasController } from "./facturasController";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import { createFacturaSchema, updateFacturaSchema, idParamSchema } from "./facturasValidation";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("facturas"));

router.get("/", facturasController.getAll);
router.get("/next-number", facturasController.getNextNumber);
router.get("/:id", validate(idParamSchema), facturasController.getById);
router.post("/", validate(createFacturaSchema), facturasController.create);
router.put("/:id", validate(updateFacturaSchema), facturasController.update);
router.delete("/:id", validate(idParamSchema), facturasController.delete);

export const facturasRoutes = router;
