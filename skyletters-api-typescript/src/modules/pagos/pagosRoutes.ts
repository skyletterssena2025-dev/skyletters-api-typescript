import { Router } from "express";
import { pagosController } from "./pagosController";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import { createPagoSchema, idParamSchema } from "./pagosValidation";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("pagos"));

// GET / lista todos los pagos; con ?idFactura filtra por factura.
router.get("/", pagosController.getAll);
router.post("/", validate(createPagoSchema), pagosController.registrar);
router.delete("/:id", validate(idParamSchema), pagosController.delete);

export const pagosRoutes = router;
