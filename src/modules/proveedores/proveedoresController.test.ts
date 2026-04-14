import { Response, NextFunction } from "express";
import { proveedoresController } from "./proveedoresController";
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
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = {
            params: {},
            body: {},
            user:{sub:1, email: "user@example.com", rol: "admin", tipo:"usuario"}
        };

        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });

    describe("getAll", () => {
        test("debería devolver una lista de proveedores", async () => {
            (proveedoresServices.getAll as jest.Mock).mockResolvedValue([mockProveedor]);
            await proveedoresController.getAll(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.getAll).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith([mockProveedor]);
        });
        test("debería manejar errores", async () => {
            const error = new Error("Error al obtener proveedores");
            (proveedoresServices.getAll as jest.Mock).mockRejectedValue(error);
            await proveedoresController.getAll(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.getAll).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe("findByNit", () => {
        test("debería devolver un proveedor por NIT", async () => {
            (proveedoresServices.findByNit as jest.Mock).mockResolvedValue(mockProveedor);
            mockReq.params = { nit: mockProveedor.nitProveedor };
            await proveedoresController.findByNit(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.findByNit).toHaveBeenCalledWith(mockProveedor.nitProveedor);
            expect(mockRes.json).toHaveBeenCalledWith(mockProveedor);
        });
        test("debería manejar errores", async () => {
            const error = new Error("Error al obtener proveedor");
            (proveedoresServices.findByNit as jest.Mock).mockRejectedValue(error);
            mockReq.params = { nit: mockProveedor.nitProveedor };
            await proveedoresController.findByNit(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.findByNit).toHaveBeenCalledWith(mockProveedor.nitProveedor);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe("create", () => {
        test("debería crear un nuevo proveedor", async () => {
            (proveedoresServices.create as jest.Mock).mockResolvedValue(mockProveedor);
            mockReq.body = {
                nitProveedor: mockProveedor.nitProveedor,
                nombreProveedor: mockProveedor.nombreProveedor,
                telefonoProveedor: mockProveedor.telefonoProveedor,
                correoProveedor: mockProveedor.correoProveedor,
                direccionProveedor: mockProveedor.direccionProveedor,
                ciudadProveedor: mockProveedor.ciudadProveedor,
                estadoProveedor: mockProveedor.estadoProveedor,
                razonSocial: mockProveedor.razonSocial,
            };
            await proveedoresController.create(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.create).toHaveBeenCalledWith(mockReq.body);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockProveedor);
        });
        test("debería manejar errores", async () => {
            const error = new Error("Error al crear proveedor");
            (proveedoresServices.create as jest.Mock).mockRejectedValue(error);
            mockReq.body = {
                nitProveedor: mockProveedor.nitProveedor,
                nombreProveedor: mockProveedor.nombreProveedor,
                telefonoProveedor: mockProveedor.telefonoProveedor,
                correoProveedor: mockProveedor.correoProveedor,
                direccionProveedor: mockProveedor.direccionProveedor,
                ciudadProveedor: mockProveedor.ciudadProveedor,
                estadoProveedor: mockProveedor.estadoProveedor,
                razonSocial: mockProveedor.razonSocial,
            };
            await proveedoresController.create(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(proveedoresServices.create).toHaveBeenCalledWith(mockReq.body);
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});