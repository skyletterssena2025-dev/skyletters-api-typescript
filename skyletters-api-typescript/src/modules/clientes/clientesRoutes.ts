import { Router } from "express";
import { clientesController } from "./clientesController";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import { createClienteSchema, updateClienteSchema, idParamSchema } from "./clientesValidation";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("clientes"));

router.get("/", clientesController.getAll);
router.get("/:id", validate(idParamSchema), clientesController.getById);
router.post("/", validate(createClienteSchema), clientesController.create);
router.put("/:id", validate(updateClienteSchema), clientesController.update);
router.delete("/:id", validate(idParamSchema), clientesController.delete);

export const clientesRoutes = router;
