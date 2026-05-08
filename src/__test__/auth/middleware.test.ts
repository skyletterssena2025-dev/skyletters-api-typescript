import { prisma } from "../../config/database";
import { type AuthRequest } from "../../middlewares/auth";
import { requireRole } from "../../middlewares/roles";
import { Response, NextFunction } from "express";

jest.mock("../../services/auth/jwtService");
jest.mock("../../config/database", () => ({
  prisma: {
    rolesYPermisos: {
      findFirst: jest.fn(),
    },
  },
}));
describe("authController", () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });
  describe("requireRole - control De Permisos", () => {
    it("Debe permitir el acceso si el usuario tiene el rol requerido", async () => {
      const middleware = requireRole("crear");
      mockReq.user = {
        sub: 1,
        email: "test@example.com",
        rol: "admin",
        tipo: "empleado",
      };
      const mockRole = {
        id: 1,
        nombre: "admin",
        listaPermisos: "crear,leer,actualizar,eliminar",
        listaRol: "admin",
        descripcion: "Administrador con todos los permisos",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.rolesYPermisos.findFirst as jest.Mock).mockResolvedValue(
        mockRole,
      );
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
