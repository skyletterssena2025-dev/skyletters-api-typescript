import { Router } from "express";
import { Response, NextFunction } from "express";
import { prisma } from "../../config/database";
import { authMiddleware, type AuthRequest } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("inventario"));

// Kardex: movimientos de inventario (solo lectura), con el nombre del producto aplanado.
router.get("/", async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const movs = await prisma.movimientoInventario.findMany({
      orderBy: { id: "desc" },
      include: { producto: true },
    });
    const data = movs.map((m) => ({
      id: m.id,
      codigoProducto: m.producto?.codigoProducto ?? "",
      productoNombre: m.producto?.nombreProducto ?? `#${m.idProducto}`,
      tipo: m.tipo,
      cantidad: m.cantidad,
      saldoResultante: m.saldoResultante,
      motivo: m.motivo,
      fecha: m.fecha,
    }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export const inventarioRoutes = router;
