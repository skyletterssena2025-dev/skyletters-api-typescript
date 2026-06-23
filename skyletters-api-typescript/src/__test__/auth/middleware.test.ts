import { requireRole } from "../../middlewares/roles";
import { authMiddleware, type AuthRequest } from "../../middlewares/auth";
import { Response, NextFunction } from "express";
import { prisma } from "../../config/database";

jest.mock("../../services/auth/jwtService");
jest.mock("../../config/database", () => ({
  prisma: {
    rolesYPermisos: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe("Middleware de Autenticación y Roles", () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };

    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });


  describe("authMiddleware", () => {
    it("debe rechazar si no hay token", async () => {
      mockReq.headers = {};

      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Token de acceso no proporcionado"
        })
      )
    });

    it("debe rechazar si el token no comienza con 'Bearer '", async () => {
      mockReq.headers = { authorization: "Basic token123" };

      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe("requireRole - Control de permisos", () => {
    it("debe rechazar si no hay usuario autenticado", async () => {
      const middleware = requireRole("crear");
      mockReq.user = undefined;

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Autenticación requerida",
        })
      );
    });

    it("debe permitir acceso si el usuario tiene el permiso requerido", async () => {
      const middleware = requireRole("usuarios");
      mockReq.user = {
        sub: 1,
        email: "admin@skyletters.com",
        rol: "admin",
        tipo: "empleado",
      }

      const mockRol = {
        id: 1,
        nombre: "Administrador",
        listaPermisos: "usuarios,roles,parametrizacion,asientos,reportes,impuestos,conciliacion",
        listaRol: "admin,Administrador",
        descripcion: "Rol con todos los permisos del sistema"
      };

      (prisma.rolesYPermisos.findMany as jest.Mock).mockResolvedValue([mockRol]);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
