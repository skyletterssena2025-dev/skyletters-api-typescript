import { Response, NextFunction } from "express";
import { proveedoresController } from "../../modules/proveedores/proveedoresController";
import { proveedoresServices } from "../../services/proveedores/proveedoresServices";
import type { AuthRequest } from "@/middlewares/auth";
import type { Proveedor } from "@prisma/client";

jest.mock("../../services/proveedores/proveedoresServices");

describe("proveedoresController", () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    const mockProveedor: Proveedor = {
        id: 1,
        nitProveedor: "123456789",
        nombreProveedor: "Proveedor Ejemplo",
        telefonoProveedor: "555-1234",
        correoProveedor: "proveedor@example.com",
        direccionProveedor: "Calle Falsa 123",
        ciudadProveedor: "Ciudad Ejemplo",
        estadoProveedor: true,
        razonSocial: "Proveedor Ejemplo S.A.",
        impuestosAplicables: "",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = {
            params: {},
            body: {},
            user: { sub: 1, email: "user@example.com", rol: "admin", tipo: "usuario" },
        };

        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        mockNext = jest.fn();
    });

    describe("getAll", () => {
        test("debería devolver una lista de proveedores", async () => {
            (proveedoresServices.getAll as jest.Mock).mockResolvedValue([mockProveedor]);
            await proveedoresController.getAll(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.getAll).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: [mockProveedor] });
        });
        test("debería manejar errores", async () => {
            const error = new Error("Error al obtener proveedores");
            (proveedoresServices.getAll as jest.Mock).mockRejectedValue(error);
            await proveedoresController.getAll(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.getAll).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe("getById", () => {
        test("debería devolver un proveedor por id", async () => {
            (proveedoresServices.getById as jest.Mock).mockResolvedValue(mockProveedor);
            mockReq.params = { id: "1" };
            await proveedoresController.getById(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.getById).toHaveBeenCalledWith(1);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockProveedor });
        });
        test("debería devolver 404 si no existe", async () => {
            (proveedoresServices.getById as jest.Mock).mockResolvedValue(null);
            mockReq.params = { id: "999" };
            await proveedoresController.getById(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.getById).toHaveBeenCalledWith(999);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: "Proveedor no encontrado" });
        });
        test("debería manejar errores", async () => {
            const error = new Error("Error al obtener proveedor");
            (proveedoresServices.getById as jest.Mock).mockRejectedValue(error);
            mockReq.params = { id: "1" };
            await proveedoresController.getById(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.getById).toHaveBeenCalledWith(1);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe("create", () => {
        const body = {
            nitProveedor: "123456789",
            nombreProveedor: "Proveedor Ejemplo",
            telefonoProveedor: "555-1234",
            correoProveedor: "proveedor@example.com",
            direccionProveedor: "Calle Falsa 123",
            ciudadProveedor: "Ciudad Ejemplo",
            estadoProveedor: true,
            razonSocial: "Proveedor Ejemplo S.A.",
        };

        test("debería crear un nuevo proveedor", async () => {
            (proveedoresServices.create as jest.Mock).mockResolvedValue(mockProveedor);
            mockReq.body = body;
            await proveedoresController.create(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.create).toHaveBeenCalledWith(body);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockProveedor });
        });
        test("debería manejar errores", async () => {
            const error = new Error("Error al crear proveedor");
            (proveedoresServices.create as jest.Mock).mockRejectedValue(error);
            mockReq.body = body;
            await proveedoresController.create(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.create).toHaveBeenCalledWith(body);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe("update", () => {
        test("debería actualizar un proveedor", async () => {
            const updated = { ...mockProveedor, nombreProveedor: "Actualizado" };
            (proveedoresServices.update as jest.Mock).mockResolvedValue(updated);
            mockReq.params = { id: "1" };
            mockReq.body = { nombreProveedor: "Actualizado" };
            await proveedoresController.update(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.update).toHaveBeenCalledWith(1, { nombreProveedor: "Actualizado" });
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: updated });
        });
        test("debería manejar errores", async () => {
            const error = new Error("Error al actualizar proveedor");
            (proveedoresServices.update as jest.Mock).mockRejectedValue(error);
            mockReq.params = { id: "1" };
            mockReq.body = { nombreProveedor: "Actualizado" };
            await proveedoresController.update(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.update).toHaveBeenCalledWith(1, { nombreProveedor: "Actualizado" });
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe("delete", () => {
        test("debería eliminar un proveedor", async () => {
            (proveedoresServices.delete as jest.Mock).mockResolvedValue(undefined);
            mockReq.params = { id: "1" };
            await proveedoresController.delete(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.delete).toHaveBeenCalledWith(1);
            expect(mockRes.status).toHaveBeenCalledWith(204);
            expect(mockRes.send).toHaveBeenCalled();
        });
        test("debería manejar errores", async () => {
            const error = new Error("Error al eliminar proveedor");
            (proveedoresServices.delete as jest.Mock).mockRejectedValue(error);
            mockReq.params = { id: "1" };
            await proveedoresController.delete(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.delete).toHaveBeenCalledWith(1);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
