import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { CUENTAS, type CuentaRef } from "./cuentas";

// Cliente Prisma o transaccion: el motor puede correr dentro de la transaccion
// del documento que lo origina, o de forma independiente.
type Db = Prisma.TransactionClient | typeof prisma;

export type TipoOrigen = "FACTURA" | "NOTA" | "PAGO" | "COMPRA" | "MANUAL";

export interface Movimiento {
  codigoCuenta: string;
  nombreCuenta: string;
  debito: number;
  credito: number;
}

// Una linea del breakdown de impuestos almacenado en detalleProducto JSON.
interface TaxLine {
  nombre: string;
  esRetencion: boolean;
  monto: number;
  base: "subtotal" | "iva";
}

const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

// Extrae el desglose de impuestos guardado en el campo detalleProducto (JSON).
function parseImpuestos(detalleProducto: string): TaxLine[] {
  try {
    const parsed = JSON.parse(detalleProducto);
    const arr = Array.isArray(parsed?.impuestos) ? parsed.impuestos : [];
    return arr.map((i: any) => ({
      nombre: String(i.nombre ?? ""),
      esRetencion: Boolean(i.esRetencion),
      monto: Number(i.monto) || 0,
      base: i.base === "iva" ? "iva" : "subtotal",
    }));
  } catch {
    return [];
  }
}

// IVA total (impuestos que SUMAN) del desglose.
function ivaDe(impuestos: TaxLine[]): number {
  return impuestos.filter((i) => !i.esRetencion).reduce((a, i) => a + i.monto, 0);
}

/**
 * Obtiene el desglose de impuestos. Si el documento no trae el detalle JSON
 * (documentos legados/migrados que solo guardan agregados), lo sintetiza a
 * partir del impuesto neto (total - subtotal): positivo => IVA, negativo => retencion.
 * Asi cualquier documento produce un asiento cuadrado.
 */
function impuestosConFallback(detalleProducto: string, subtotal: number, total: number): TaxLine[] {
  const impuestos = parseImpuestos(detalleProducto);
  if (impuestos.length > 0) return impuestos;
  const neto = round2(total - subtotal);
  if (Math.abs(neto) < 0.01) return [];
  return neto >= 0
    ? [{ nombre: "IVA", esRetencion: false, monto: neto, base: "subtotal" }]
    : [{ nombre: "Retencion en la fuente", esRetencion: true, monto: -neto, base: "subtotal" }];
}

// Mapea una retencion a la cuenta de anticipo (ventas) que le corresponde.
function cuentaAnticipoRetencion(t: TaxLine): CuentaRef {
  if (t.base === "iva" || /iva/i.test(t.nombre)) return CUENTAS.ANTICIPO_RETEIVA;
  if (/ica/i.test(t.nombre)) return CUENTAS.ANTICIPO_RETEICA;
  return CUENTAS.ANTICIPO_RETEFUENTE;
}

// Mapea una retencion practicada (compras) a la cuenta de pasivo por pagar.
function cuentaRetencionPorPagar(t: TaxLine): CuentaRef {
  if (t.base === "iva" || /iva/i.test(t.nombre)) return CUENTAS.RETEIVA_PORPAGAR;
  if (/ica/i.test(t.nombre)) return CUENTAS.RETEICA_PORPAGAR;
  return CUENTAS.RETEFUENTE_PORPAGAR;
}

// Suma montos por cuenta y descarta lineas en cero. Acepta acumular debito o credito.
function acumular(
  lineas: Movimiento[],
  cuenta: CuentaRef,
  campo: "debito" | "credito",
  monto: number,
): void {
  const valor = round2(monto);
  if (valor <= 0) return;
  const existente = lineas.find((l) => l.codigoCuenta === cuenta.codigo);
  if (existente) {
    existente[campo] = round2(existente[campo] + valor);
  } else {
    lineas.push({
      codigoCuenta: cuenta.codigo,
      nombreCuenta: cuenta.nombre,
      debito: campo === "debito" ? valor : 0,
      credito: campo === "credito" ? valor : 0,
    });
  }
}

// --- Constructores de movimientos por tipo de documento ---

// Factura de venta: el cliente queda debiendo el total; ingresos y IVA se acreditan;
// las retenciones que nos practican son anticipos (debito).
function movimientosFactura(subtotal: number, impuestos: TaxLine[], total: number): Movimiento[] {
  const lineas: Movimiento[] = [];
  acumular(lineas, CUENTAS.CLIENTES, "debito", total);
  for (const r of impuestos.filter((i) => i.esRetencion)) {
    acumular(lineas, cuentaAnticipoRetencion(r), "debito", r.monto);
  }
  acumular(lineas, CUENTAS.INGRESOS_VENTAS, "credito", subtotal);
  acumular(lineas, CUENTAS.IVA_GENERADO, "credito", ivaDe(impuestos));
  return lineas;
}

// Nota credito (devolucion): reversa de la factura.
function movimientosNotaCredito(subtotal: number, impuestos: TaxLine[], total: number): Movimiento[] {
  const lineas: Movimiento[] = [];
  acumular(lineas, CUENTAS.DEVOLUCIONES_VENTAS, "debito", subtotal);
  acumular(lineas, CUENTAS.IVA_GENERADO, "debito", ivaDe(impuestos));
  acumular(lineas, CUENTAS.CLIENTES, "credito", total);
  for (const r of impuestos.filter((i) => i.esRetencion)) {
    acumular(lineas, cuentaAnticipoRetencion(r), "credito", r.monto);
  }
  return lineas;
}

// Nota debito: mismo sentido que la factura (mayor valor a cobrar).
function movimientosNotaDebito(subtotal: number, impuestos: TaxLine[], total: number): Movimiento[] {
  return movimientosFactura(subtotal, impuestos, total);
}

// Compra: inventario e IVA descontable al debito; proveedor y retenciones practicadas al credito.
function movimientosCompra(subtotal: number, impuestos: TaxLine[], total: number): Movimiento[] {
  const lineas: Movimiento[] = [];
  acumular(lineas, CUENTAS.INVENTARIO, "debito", subtotal);
  acumular(lineas, CUENTAS.IVA_DESCONTABLE, "debito", ivaDe(impuestos));
  acumular(lineas, CUENTAS.PROVEEDORES, "credito", total);
  for (const r of impuestos.filter((i) => i.esRetencion)) {
    acumular(lineas, cuentaRetencionPorPagar(r), "credito", r.monto);
  }
  return lineas;
}

// Pago/abono recibido: entra a bancos (o caja) y baja la cuenta del cliente.
function movimientosPago(monto: number, formaPago: string): Movimiento[] {
  const lineas: Movimiento[] = [];
  const esEfectivo = /efectivo|caja/i.test(formaPago || "");
  acumular(lineas, esEfectivo ? CUENTAS.CAJA : CUENTAS.BANCOS, "debito", monto);
  acumular(lineas, CUENTAS.CLIENTES, "credito", monto);
  return lineas;
}

// --- Registro del asiento (con validacion de partida doble) ---

interface PostInput {
  tipoOrigen: TipoOrigen;
  idOrigen: number | null;
  numeroFactura: number;
  descripcion: string;
  usuarioCreador: string;
  fecha: Date;
  movimientos: Movimiento[];
}

// Valida debitos == creditos y crea el asiento + sus movimientos. Idempotente por
// (tipoOrigen, idOrigen): si ya existe un asiento para ese documento, lo reemplaza.
async function postAsiento(db: Db, input: PostInput) {
  const movimientos = input.movimientos.filter((m) => m.debito > 0 || m.credito > 0);
  const totalDebito = round2(movimientos.reduce((a, m) => a + m.debito, 0));
  const totalCredito = round2(movimientos.reduce((a, m) => a + m.credito, 0));

  if (movimientos.length === 0) {
    throw AppError.badRequest("El asiento no tiene movimientos");
  }
  if (Math.abs(totalDebito - totalCredito) > 0.01) {
    throw AppError.badRequest(
      `Asiento descuadrado: debitos ${totalDebito} != creditos ${totalCredito}`,
    );
  }

  // Reemplazo idempotente del asiento del documento.
  if (input.idOrigen !== null) {
    const previo = await db.asientoContable.findUnique({
      where: { origen_unico: { tipoOrigen: input.tipoOrigen, idOrigen: input.idOrigen } },
    });
    if (previo) await db.asientoContable.delete({ where: { id: previo.id } });
  }

  const lista = movimientos
    .map((m) => `${m.codigoCuenta}:${m.debito > 0 ? "D" : "C"}${m.debito > 0 ? m.debito : m.credito}`)
    .join(";");

  return db.asientoContable.create({
    data: {
      fechaCreacionRegistro: input.fecha,
      fechaModificacion: input.fecha,
      numeroFactura: input.numeroFactura,
      descripcion: input.descripcion,
      usuarioCreador: input.usuarioCreador,
      listaMovimiContable: lista,
      tipoOrigen: input.tipoOrigen,
      idOrigen: input.idOrigen,
      totalDebito,
      totalCredito,
      movimientos: { create: movimientos },
    },
    include: { movimientos: true },
  });
}

export const partidaDoble = {
  /**
   * Genera (o regenera) el asiento contable de una factura de venta.
   * Debita cartera (clientes) y los anticipos de retencion; acredita ingresos e IVA.
   * @param factura Factura origen (con totales y desglose de impuestos en detalleProducto).
   * @param usuario Usuario que registra el asiento. Por defecto "sistema".
   * @param db Cliente Prisma o transaccion donde ejecutar. Por defecto la conexion global.
   * @returns El asiento contable creado con sus movimientos.
   */
  async generarDesdeFactura(
    factura: { id: number; numeroFactura: number; fechaFactura: Date; subtotalFactura: number; totalFactura: number; detalleProducto: string },
    usuario = "sistema",
    db: Db = prisma,
  ) {
    const impuestos = impuestosConFallback(factura.detalleProducto, factura.subtotalFactura, factura.totalFactura);
    return postAsiento(db, {
      tipoOrigen: "FACTURA",
      idOrigen: factura.id,
      numeroFactura: factura.numeroFactura,
      descripcion: `Venta segun factura N° ${factura.numeroFactura}`,
      usuarioCreador: usuario,
      fecha: new Date(factura.fechaFactura),
      movimientos: movimientosFactura(factura.subtotalFactura, impuestos, factura.totalFactura),
    });
  },

  /**
   * Genera (o regenera) el asiento contable de una nota credito o debito.
   * La nota CREDITO reversa la venta (devolucion); la DEBITO la incrementa.
   * @param nota Nota origen (tipo CREDITO|DEBITO, totales y desglose de impuestos).
   * @param usuario Usuario que registra el asiento. Por defecto "sistema".
   * @param db Cliente Prisma o transaccion. Por defecto la conexion global.
   * @returns El asiento contable creado con sus movimientos.
   */
  async generarDesdeNota(
    nota: { id: number; tipo: string; numero: number; idFactura: number; fecha: Date; subtotal: number; total: number; detalleProducto: string },
    usuario = "sistema",
    db: Db = prisma,
  ) {
    const impuestos = impuestosConFallback(nota.detalleProducto, nota.subtotal, nota.total);
    const esCredito = nota.tipo === "CREDITO";
    return postAsiento(db, {
      tipoOrigen: "NOTA",
      idOrigen: nota.id,
      numeroFactura: nota.idFactura,
      descripcion: `Nota ${esCredito ? "credito" : "debito"} N° ${nota.numero} (factura ${nota.idFactura})`,
      usuarioCreador: usuario,
      fecha: new Date(nota.fecha),
      movimientos: esCredito
        ? movimientosNotaCredito(nota.subtotal, impuestos, nota.total)
        : movimientosNotaDebito(nota.subtotal, impuestos, nota.total),
    });
  },

  /**
   * Genera (o regenera) el asiento contable de una compra a proveedor.
   * Debita inventario e IVA descontable; acredita la cuenta del proveedor y las
   * retenciones practicadas (pasivo por pagar).
   * @param compra Compra origen (totales y desglose de impuestos en detalleProducto).
   * @param usuario Usuario que registra el asiento. Por defecto "sistema".
   * @param db Cliente Prisma o transaccion. Por defecto la conexion global.
   * @returns El asiento contable creado con sus movimientos.
   */
  async generarDesdeCompra(
    compra: { id: number; numeroFactura: number; fechaCompra: Date; subtotal: number; total: number; detalleProducto: string },
    usuario = "sistema",
    db: Db = prisma,
  ) {
    const impuestos = impuestosConFallback(compra.detalleProducto, compra.subtotal, compra.total);
    return postAsiento(db, {
      tipoOrigen: "COMPRA",
      idOrigen: compra.id,
      numeroFactura: compra.numeroFactura,
      descripcion: `Compra segun factura proveedor N° ${compra.numeroFactura}`,
      usuarioCreador: usuario,
      fecha: new Date(compra.fechaCompra),
      movimientos: movimientosCompra(compra.subtotal, impuestos, compra.total),
    });
  },

  /**
   * Genera el asiento contable de un abono recibido (pago de cartera).
   * Debita caja o bancos (segun forma de pago) y acredita la cuenta del cliente.
   * @param pago Abono registrado (id, monto, forma de pago, fecha).
   * @param numeroFactura Numero de la factura abonada (para la descripcion).
   * @param usuario Usuario que registra el asiento. Por defecto "sistema".
   * @param db Cliente Prisma o transaccion. Por defecto la conexion global.
   * @returns El asiento contable creado con sus movimientos.
   */
  async generarDesdePago(
    pago: { id: number; idFactura: number; fecha: Date; monto: number; formaPago: string },
    numeroFactura: number,
    usuario = "sistema",
    db: Db = prisma,
  ) {
    return postAsiento(db, {
      tipoOrigen: "PAGO",
      idOrigen: pago.id,
      numeroFactura,
      descripcion: `Abono recibido factura N° ${numeroFactura}`,
      usuarioCreador: usuario,
      fecha: new Date(pago.fecha),
      movimientos: movimientosPago(pago.monto, pago.formaPago),
    });
  },

  /**
   * Elimina el asiento contable asociado a un documento (al anular o borrar el documento).
   * @param tipoOrigen Tipo de documento origen (FACTURA, NOTA, PAGO, COMPRA).
   * @param idOrigen Id del documento origen.
   * @param db Cliente Prisma o transaccion. Por defecto la conexion global.
   */
  async eliminarPorOrigen(tipoOrigen: TipoOrigen, idOrigen: number, db: Db = prisma) {
    await db.asientoContable.deleteMany({ where: { tipoOrigen, idOrigen } });
  },

  /**
   * Valida la partida doble de un asiento manual: la suma de debitos debe igualar
   * la de creditos (tolerancia 0.01 por redondeo). Lanza AppError si no cuadra.
   * @param movimientos Lineas debito/credito a validar.
   * @returns Los totales de debito y credito calculados.
   */
  validarBalance(movimientos: Movimiento[]): { totalDebito: number; totalCredito: number } {
    const totalDebito = round2(movimientos.reduce((a, m) => a + (Number(m.debito) || 0), 0));
    const totalCredito = round2(movimientos.reduce((a, m) => a + (Number(m.credito) || 0), 0));
    if (Math.abs(totalDebito - totalCredito) > 0.01) {
      throw AppError.badRequest(
        `Asiento descuadrado: debitos ${totalDebito} != creditos ${totalCredito}`,
      );
    }
    return { totalDebito, totalCredito };
  },
};
