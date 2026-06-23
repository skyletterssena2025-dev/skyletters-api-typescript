import { Router } from "express";
import { personasController } from "./personasController";
import { createPersonaSchema } from "./personasValidation";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createPersonaSchema), personasController.create);


export const personasRoutes = router;