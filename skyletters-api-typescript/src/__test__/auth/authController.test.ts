import { authService } from "../../services/auth/authService";
import { authController } from "../../modules/auth/authController";
import { Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth";

jest.mock("../../services/auth/authService");

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

  describe("login", () => {
    it("Autenticacion con credenciales correctas", async () => {
      const mockLogin = {
        usuario: {
          id: 1,
          nombreUsuario: "Test User",
          correoUsuario: "test@example.com",
          rolUsuario: "admin",
          tipoUsuario: "empleado",
          estadoUsuario: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        tokens: {
          accessToken: "mockAccessToken",
          refreshToken: "mockRefreshToken",
          expiresToken: "1h",
        },
      };
      mockReq.body = {
        correoUsuario: "test@example.com",
        contrasenaUsuario: "password123",
      };
      (authService.login as jest.Mock).mockResolvedValue(mockLogin);
   
    await authController.login(
      mockReq as AuthRequest,
      mockRes as Response,
      mockNext,
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: mockLogin,
    });
    expect(mockNext).not.toHaveBeenCalled();
     });
  });
});
