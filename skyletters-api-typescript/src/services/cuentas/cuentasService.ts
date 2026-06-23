import { cuentasRepository, type CuentaData } from "../../repositories/cuentasRepository";
import { AppError } from "../../utils/AppError";
import type { CuentaPUC } from "@prisma/client";

export const cuentasService = {
  /**
   * Lista todas las cuentas del Plan Unico de Cuentas (PUC), ordenadas por codigo.
   * @returns Arreglo de cuentas contables.
   */
  async getAll(): Promise<CuentaPUC[]> {
    return cuentasRepository.findAll();
  },

  /**
   * Obtiene una cuenta del PUC por su id.
   * @param id Id de la cuenta.
   * @returns La cuenta, o null si no existe.
   */
  async getById(id: number): Promise<CuentaPUC | null> {
    return cuentasRepository.findById(id);
  },

  /**
   * Crea una cuenta del PUC. Rechaza codigos duplicados e infiere la clase
   * (primer digito del codigo) si no se envia.
   * @param input Datos de la cuenta (codigo, nombre, naturaleza, etc.).
   * @returns La cuenta creada.
   */
  async create(input: CuentaData): Promise<CuentaPUC> {
    const existente = await cuentasRepository.findByCodigo(input.codigo);
    if (existente) throw AppError.badRequest(`Ya existe una cuenta con el codigo ${input.codigo}`);
    // La clase es el primer digito del codigo del PUC.
    const clase = input.clase || Number(input.codigo[0]);
    return cuentasRepository.create({ ...input, clase });
  },

  /**
   * Actualiza una cuenta del PUC. Valida que el nuevo codigo no choque con otro.
   * @param id Id de la cuenta a actualizar.
   * @param input Campos a modificar.
   * @returns La cuenta actualizada.
   */
  async update(id: number, input: Partial<CuentaData>): Promise<CuentaPUC> {
    const c = await cuentasRepository.findById(id);
    if (!c) throw AppError.notFound("Cuenta contable no encontrada");
    if (input.codigo && input.codigo !== c.codigo) {
      const dup = await cuentasRepository.findByCodigo(input.codigo);
      if (dup) throw AppError.badRequest(`Ya existe una cuenta con el codigo ${input.codigo}`);
    }
    return cuentasRepository.update(id, input);
  },

  /**
   * Elimina una cuenta del PUC.
   * @param id Id de la cuenta a eliminar.
   */
  async delete(id: number): Promise<void> {
    const c = await cuentasRepository.findById(id);
    if (!c) throw AppError.notFound("Cuenta contable no encontrada");
    await cuentasRepository.delete(id);
  },
};
