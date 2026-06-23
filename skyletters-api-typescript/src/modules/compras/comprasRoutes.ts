import { Router } from "express";
import { comprasController } from "./comprasController";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import { createCompraSchema, updateCompraSchema, idParamSchema } from "./comprasValidation";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("compras"));

router.get("/", comprasController.getAll);
router.get("/:id", validate(idParamSchema), comprasController.getById);
router.post("/", validate(createCompraSchema), comprasController.create);
router.put("/:id", validate(updateCompraSchema), comprasController.update);
router.delete("/:id", validate(idParamSchema), comprasController.delete);

export const comprasRoutes = router;
