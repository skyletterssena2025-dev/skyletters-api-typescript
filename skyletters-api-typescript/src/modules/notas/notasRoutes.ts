import { Router } from "express";
import { notasController } from "./notasController";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import { createNotaSchema, updateNotaSchema, idParamSchema } from "./notasValidation";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("notas"));

router.get("/", notasController.getAll);
router.get("/next-number", notasController.getNextNumber);
router.get("/:id", validate(idParamSchema), notasController.getById);
router.post("/", validate(createNotaSchema), notasController.create);
router.put("/:id", validate(updateNotaSchema), notasController.update);
router.delete("/:id", validate(idParamSchema), notasController.delete);

export const notasRoutes = router;
