import { Router } from "express";
import { productosController } from "./productosController";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import { createProductoSchema, updateProductoSchema, idParamSchema } from "./productosValidation";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("productos"));

router.get("/", productosController.getAll);
router.get("/:id", validate(idParamSchema), productosController.getById);
router.post("/", validate(createProductoSchema), productosController.create);
router.put("/:id", validate(updateProductoSchema), productosController.update);
router.delete("/:id", validate(idParamSchema), productosController.delete);

export const productosRoutes = router;
