import { conciliacionRepository } from "../../repositories/conciliacionRepository";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import type { ConciliacionBancaria } from "@prisma/client";

export interface CreateConciliacionInput {
  cuentaBancaria: string;
  banco: string;
  periodoInicio: Date;
  periodoFin: Date;
  movimientosConciliados?: number;
  saldoBancario: number;
  saldoContable: number;
}

export interface ExtractoLineaInput {
  fecha: Date;
  descripcion: string;
  referencia?: string | null;
  valor: number;
}

const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Codigos de cuenta del PUC que representan el disponible (caja/bancos) y contra
 * los que se concilia el extracto. Se derivan del PUC (clase 1, codigo "11xx").
 */
async function cuentasDeBanco(): Promise<string[]> {
  const cuentas = await prisma.cuentaPUC.findMany({
    where: { aceptaMovimiento: true, codigo: { startsWith: "11" } },
    select: { codigo: true },
  });
  const codigos = cuentas.map((c) => c.codigo);
  // Respaldo por si el PUC no esta sembrado.
  return codigos.length ? codigos : ["110505", "111005"];
}

/**
 * Movimientos contables (libro) sobre las cuentas de banco en el periodo de la
 * conciliacion. valor = debito - credito (ingreso positivo, egreso negativo).
 */
async function movimientosLibro(c: ConciliacionBancaria) {
  const codigos = await cuentasDeBanco();
  const movs = await prisma.movimientoContable.findMany({
    where: {
      codigoCuenta: { in: codigos },
      asiento: { fechaCreacionRegistro: { gte: c.periodoInicio, lte: c.periodoFin } },
    },
    include: { asiento: { select: { numeroFactura: true, tipoOrigen: true, descripcion: true, fechaCreacionRegistro: true } } },
    orderBy: { id: "asc" },
  });
  return movs.map((m) => ({
    id: m.id,
    fecha: m.asiento.fechaCreacionRegistro,
    descripcion: m.asiento.descripcion,
    cuenta: `${m.codigoCuenta} ${m.nombreCuenta}`,
    origen: m.asiento.tipoOrigen,
    valor: round2(m.debito - m.credito),
  }));
}

export const conciliacionService = {
  /**
   * Lista todas las conciliaciones bancarias.
   * @returns Arreglo de conciliaciones.
   */
  async getAll(): Promise<ConciliacionBancaria[]> {
    return conciliacionRepository.findAll();
  },

  /**
   * Obtiene una conciliacion por id.
   * @param id Id de la conciliacion.
   */
  async getById(id: number): Promise<ConciliacionBancaria | null> {
    return conciliacionRepository.findById(id);
  },

  /**
   * Crea una conciliacion bancaria (cabecera: cuenta, banco, periodo).
   * @param input Datos de la conciliacion.
   */
  async create(input: CreateConciliacionInput): Promise<ConciliacionBancaria> {
    return conciliacionRepository.create(input);
  },

  /**
   * Actualiza la cabecera de una conciliacion.
   * @param id Id de la conciliacion.
   * @param data Campos a modificar.
   */
  async update(id: number, data: Partial<CreateConciliacionInput>): Promise<ConciliacionBancaria> {
    const c = await conciliacionRepository.findById(id);
    if (!c) throw AppError.notFound("Conciliación no encontrada");
    return conciliacionRepository.update(id, data);
  },

  /**
   * Elimina una conciliacion (y su extracto en cascada).
   * @param id Id de la conciliacion.
   */
  async delete(id: number): Promise<void> {
    const c = await conciliacionRepository.findById(id);
    if (!c) throw AppError.notFound("Conciliación no encontrada");
    await conciliacionRepository.delete(id);
  },

  /**
   * Carga (reemplaza) las lineas del extracto bancario de una conciliacion.
   * @param id Id de la conciliacion.
   * @param lineas Movimientos del extracto (fecha, descripcion, valor +/-).
   * @returns La cantidad de lineas cargadas.
   */
  async cargarExtracto(id: number, lineas: ExtractoLineaInput[]): Promise<{ cargadas: number }> {
    const c = await conciliacionRepository.findById(id);
    if (!c) throw AppError.notFound("Conciliación no encontrada");
    return prisma.$transaction(async (tx) => {
      await tx.movimientoBancario.deleteMany({ where: { idConciliacion: id } });
      if (lineas.length) {
        await tx.movimientoBancario.createMany({
          data: lineas.map((l) => ({
            idConciliacion: id,
            fecha: new Date(l.fecha),
            descripcion: l.descripcion,
            referencia: l.referencia ?? null,
            valor: round2(l.valor),
            conciliado: false,
            idMovContable: null,
          })),
        });
      }
      return { cargadas: lineas.length };
    });
  },

  /**
   * Concilia: cruza automaticamente cada linea del extracto con un movimiento
   * contable de banco del periodo por igualdad de valor. Marca los cruces,
   * actualiza saldos (bancario y contable) y deja las partidas no conciliadas.
   * @param id Id de la conciliacion.
   * @returns El detalle de la conciliacion tras el cruce.
   */
  async conciliar(id: number) {
    const c = await conciliacionRepository.findById(id);
    if (!c) throw AppError.notFound("Conciliación no encontrada");

    const extracto = await prisma.movimientoBancario.findMany({
      where: { idConciliacion: id },
      orderBy: { id: "asc" },
    });
    const libro = await movimientosLibro(c);

    // Cruce 1:1 por valor exacto. Cada movimiento de libro se usa una sola vez.
    const libroDisponible = new Map<number, number>(libro.map((l) => [l.id, l.valor]));
    let conciliados = 0;
    for (const linea of extracto) {
      let matchId: number | null = null;
      for (const [lid, lvalor] of libroDisponible) {
        if (Math.abs(lvalor - linea.valor) < 0.01) {
          matchId = lid;
          break;
        }
      }
      const conciliado = matchId !== null;
      if (conciliado) {
        libroDisponible.delete(matchId!);
        conciliados++;
      }
      await prisma.movimientoBancario.update({
        where: { id: linea.id },
        data: { conciliado, idMovContable: matchId },
      });
    }

    const saldoBancario = round2(extracto.reduce((a, l) => a + l.valor, 0));
    const saldoLibro = round2(libro.reduce((a, l) => a + l.valor, 0));
    await conciliacionRepository.update(id, {
      saldoBancario,
      saldoContable: saldoLibro,
      movimientosConciliados: conciliados,
    });

    return this.getDetalle(id);
  },

  /**
   * Detalle de la conciliacion: lineas del extracto (conciliadas/pendientes),
   * movimientos del libro (cruzados/pendientes) y totales con la diferencia.
   * @param id Id de la conciliacion.
   */
  async getDetalle(id: number) {
    const c = await conciliacionRepository.findById(id);
    if (!c) throw AppError.notFound("Conciliación no encontrada");

    const extracto = await prisma.movimientoBancario.findMany({
      where: { idConciliacion: id },
      orderBy: { fecha: "asc" },
    });
    const libro = await movimientosLibro(c);
    const cruzados = new Set(extracto.filter((e) => e.idMovContable != null).map((e) => e.idMovContable));

    const saldoBancario = round2(extracto.reduce((a, l) => a + l.valor, 0));
    const saldoLibro = round2(libro.reduce((a, l) => a + l.valor, 0));
    const pendientesBanco = extracto.filter((e) => !e.conciliado).length;
    const pendientesLibro = libro.filter((l) => !cruzados.has(l.id)).length;

    return {
      conciliacion: c,
      extracto: extracto.map((e) => ({
        id: e.id,
        fecha: e.fecha,
        descripcion: e.descripcion,
        referencia: e.referencia,
        valor: e.valor,
        conciliado: e.conciliado,
      })),
      libro: libro.map((l) => ({ ...l, conciliado: cruzados.has(l.id) })),
      totales: {
        saldoBancario,
        saldoLibro,
        diferencia: round2(saldoBancario - saldoLibro),
        conciliados: extracto.filter((e) => e.conciliado).length,
        pendientesBanco,
        pendientesLibro,
      },
    };
  },
};
