import { asientosRepository, type MovimientoInput } from "../../repositories/asientosRepository";
import { AppError } from "../../utils/AppError";
import { partidaDoble } from "../partidaDoble/partidaDobleService";
import type { AsientoContable } from "@prisma/client";

export interface CreateAsientoInput {
  fechaCreacionRegistro: Date;
  numeroFactura: number;
  descripcion: string;
  usuarioCreador: string;
  fechaModificacion: Date;
  listaMovimiContable?: string;
  // Partida doble: lineas debito/credito. Si se envian, se valida el cuadre.
  movimientos?: MovimientoInput[];
}

const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

// Construye un resumen legible "codigo:Dvalor;codigo:Cvalor;…" desde los movimientos.
function resumen(movimientos: MovimientoInput[]): string {
  return movimientos
    .map((m) => `${m.codigoCuenta}:${Number(m.debito) > 0 ? "D" + round2(m.debito) : "C" + round2(m.credito)}`)
    .join(";");
}

export const asientosService = {
  /**
   * Lista todos los asientos del libro diario (incluye sus movimientos).
   * @returns Arreglo de asientos contables.
   */
  async getAll(): Promise<AsientoContable[]> {
    return asientosRepository.findAll();
  },

  /**
   * Obtiene un asiento por id, con sus movimientos (lineas debito/credito).
   * @param id Id del asiento.
   * @returns El asiento, o null si no existe.
   */
  async getById(id: number): Promise<AsientoContable | null> {
    return asientosRepository.findById(id);
  },

  /**
   * Crea un asiento MANUAL. Si trae movimientos estructurados valida la partida
   * doble (debitos == creditos) antes de persistir.
   * @param input Datos del asiento y, opcionalmente, sus movimientos.
   * @returns El asiento creado.
   */
  async create(input: CreateAsientoInput): Promise<AsientoContable> {
    const movimientos = input.movimientos ?? [];

    // Asiento MANUAL con movimientos: validar partida doble (debitos == creditos).
    if (movimientos.length) {
      const { totalDebito, totalCredito } = partidaDoble.validarBalance(movimientos);
      return asientosRepository.create(
        {
          fechaCreacionRegistro: input.fechaCreacionRegistro,
          numeroFactura: input.numeroFactura,
          descripcion: input.descripcion,
          usuarioCreador: input.usuarioCreador,
          fechaModificacion: input.fechaModificacion,
          listaMovimiContable: input.listaMovimiContable || resumen(movimientos),
          tipoOrigen: "MANUAL",
          idOrigen: null,
          totalDebito,
          totalCredito,
        },
        movimientos,
      );
    }

    // Compatibilidad: asiento sin movimientos estructurados (solo texto).
    return asientosRepository.create({
      fechaCreacionRegistro: input.fechaCreacionRegistro,
      numeroFactura: input.numeroFactura,
      descripcion: input.descripcion,
      usuarioCreador: input.usuarioCreador,
      fechaModificacion: input.fechaModificacion,
      listaMovimiContable: input.listaMovimiContable ?? "",
      tipoOrigen: "MANUAL",
      idOrigen: null,
    });
  },

  /**
   * Actualiza un asiento MANUAL. Los asientos generados por documentos no se
   * editan aqui. Si trae movimientos, revalida la partida doble.
   * @param id Id del asiento a actualizar.
   * @param input Campos a modificar y, opcionalmente, los nuevos movimientos.
   * @returns El asiento actualizado.
   */
  async update(id: number, input: Partial<CreateAsientoInput>): Promise<AsientoContable> {
    const a = await asientosRepository.findById(id);
    if (!a) throw AppError.notFound("Asiento contable no encontrado");
    if (a.tipoOrigen !== "MANUAL") {
      throw AppError.badRequest(
        "Este asiento fue generado automaticamente por un documento; no se edita manualmente",
      );
    }

    const { movimientos, ...rest } = input;
    if (movimientos && movimientos.length) {
      const { totalDebito, totalCredito } = partidaDoble.validarBalance(movimientos);
      return asientosRepository.update(
        id,
        {
          ...rest,
          totalDebito,
          totalCredito,
          listaMovimiContable: rest.listaMovimiContable || resumen(movimientos),
        },
        movimientos,
      );
    }
    return asientosRepository.update(id, rest);
  },

  /**
   * Elimina un asiento MANUAL. Los asientos generados por documentos deben
   * eliminarse desde su documento origen.
   * @param id Id del asiento a eliminar.
   */
  async delete(id: number): Promise<void> {
    const a = await asientosRepository.findById(id);
    if (!a) throw AppError.notFound("Asiento contable no encontrado");
    if (a.tipoOrigen !== "MANUAL") {
      throw AppError.badRequest(
        "Este asiento fue generado por un documento; eliminelo desde el documento origen",
      );
    }
    await asientosRepository.delete(id);
  },
};
