import { pagosRepository } from "../../repositories/pagosRepository";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { partidaDoble } from "../partidaDoble/partidaDobleService";
import type { Pago } from "@prisma/client";

export interface RegistrarPagoInput {
  idFactura: number;
  monto: number;
  formaPago: string;
  fecha: Date;
  nota?: string;
}

// Estado resultante de la factura según el saldo pendiente tras un movimiento.
// Sin saldo => PAGADA; saldo == total (sin abonos) => PENDIENTE; en medio => PARCIAL.
function estadoPorSaldo(nuevoSaldo: number, total: number): string {
  if (nuevoSaldo <= 0) return "PAGADA";
  if (nuevoSaldo >= total) return "PENDIENTE";
  return "PARCIAL";
}

export const pagosService = {
  async getAll(): Promise<Pago[]> {
    return pagosRepository.findAll();
  },

  async getByFactura(idFactura: number): Promise<Pago[]> {
    return pagosRepository.findByFactura(idFactura);
  },

  /**
   * Registra un abono contra una factura de cartera (CxC) y actualiza
   * su saldo pendiente y estado en una sola transacción.
   */
  async registrar(input: RegistrarPagoInput): Promise<Pago> {
    const factura = await prisma.factura.findUnique({ where: { id: input.idFactura } });
    if (!factura) throw AppError.notFound("La factura indicada no existe");
    if (factura.estado === "ANULADA") throw AppError.badRequest("La factura está anulada");

    const monto = Number(input.monto);
    if (monto <= 0) throw AppError.badRequest("El monto del abono debe ser mayor que cero");
    if (monto > factura.saldoPendiente) {
      throw AppError.badRequest("El abono excede el saldo pendiente");
    }

    return prisma.$transaction(async (tx) => {
      const pago = await pagosRepository.create(
        {
          idFactura: input.idFactura,
          fecha: input.fecha,
          monto,
          formaPago: input.formaPago,
          nota: input.nota ?? null,
        },
        tx,
      );

      const nuevoSaldo = factura.saldoPendiente - monto;
      await tx.factura.update({
        where: { id: factura.id },
        data: { saldoPendiente: nuevoSaldo, estado: estadoPorSaldo(nuevoSaldo, factura.totalFactura) },
      });

      // Partida doble: asiento del abono (entra a caja/bancos, baja cartera).
      await partidaDoble.generarDesdePago(pago, factura.numeroFactura, "sistema", tx);

      return pago;
    });
  },

  /**
   * Elimina un abono y REVIERTE el saldo de la factura: suma el monto de
   * vuelta al saldo pendiente y recalcula el estado, todo en transacción.
   */
  async delete(id: number): Promise<void> {
    const pago = await pagosRepository.findById(id);
    if (!pago) throw AppError.notFound("Pago no encontrado");

    const factura = await prisma.factura.findUnique({ where: { id: pago.idFactura } });

    await prisma.$transaction(async (tx) => {
      await pagosRepository.delete(id, tx);
      // Elimina el asiento contable del abono.
      await partidaDoble.eliminarPorOrigen("PAGO", id, tx);

      if (factura) {
        const nuevoSaldo = factura.saldoPendiente + pago.monto;
        // Si la factura está anulada no se recalcula su estado.
        const data =
          factura.estado === "ANULADA"
            ? { saldoPendiente: nuevoSaldo }
            : { saldoPendiente: nuevoSaldo, estado: estadoPorSaldo(nuevoSaldo, factura.totalFactura) };
        await tx.factura.update({ where: { id: factura.id }, data });
      }
    });
  },
};
