import { Router } from "express";
import { proveedoresController } from "./proveedoresController";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import { createProveedorSchema, updateProveedorSchema, idParamSchema } from "./proveedoresValidation";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("proveedores"));

router.get("/", proveedoresController.getAll);
router.get("/:id", validate(idParamSchema), proveedoresController.getById);
router.post("/", validate(createProveedorSchema), proveedoresController.create);
router.put("/:id", validate(updateProveedorSchema), proveedoresController.update);
router.delete("/:id", validate(idParamSchema), proveedoresController.delete);

export const proveedoresRoutes = router;
