/**
 * Backfill de contabilidad: genera los asientos de partida doble para TODOS los
 * documentos ya existentes (facturas, compras, notas, pagos) que aun no esten
 * contabilizados, de modo que el libro diario cruce con todos los documentos.
 *
 * Idempotente: re-ejecutable (cada generador reemplaza el asiento del documento).
 * Ejecutar:  npm run backfill:contabilidad
 */
import { prisma } from "../src/config/database";
import { partidaDoble } from "../src/services/partidaDoble/partidaDobleService";

async function main(): Promise<void> {
  console.log("== Backfill de contabilidad (partida doble) ==");

  // 1. Limpia asientos demo MANUAL sin movimientos estructurados (no son partida doble real).
  const demo = await prisma.asientoContable.findMany({
    where: { tipoOrigen: "MANUAL", movimientos: { none: {} } },
    select: { id: true },
  });
  if (demo.length) {
    await prisma.asientoContable.deleteMany({ where: { id: { in: demo.map((d) => d.id) } } });
    console.log(`  - Eliminados ${demo.length} asientos demo MANUAL sin movimientos`);
  }

  // 2. Facturas de venta.
  const facturas = await prisma.factura.findMany();
  for (const f of facturas) await partidaDoble.generarDesdeFactura(f, "migracion");
  console.log(`  - Facturas contabilizadas: ${facturas.length}`);

  // 3. Compras a proveedor.
  const compras = await prisma.compra.findMany();
  for (const c of compras) await partidaDoble.generarDesdeCompra(c, "migracion");
  console.log(`  - Compras contabilizadas: ${compras.length}`);

  // 4. Notas credito/debito.
  const notas = await prisma.notaContable.findMany();
  for (const n of notas) await partidaDoble.generarDesdeNota(n, "migracion");
  console.log(`  - Notas contabilizadas: ${notas.length}`);

  // 5. Abonos / pagos de cartera (requieren el numero de la factura abonada).
  const pagos = await prisma.pago.findMany({ include: { factura: true } });
  for (const p of pagos) {
    await partidaDoble.generarDesdePago(p, p.factura.numeroFactura, "migracion");
  }
  console.log(`  - Pagos contabilizados: ${pagos.length}`);

  // 5a. Normaliza cartera (CxC): recalcula saldoPendiente = total - abonos y el
  // estado. Corrige facturas legadas que nacieron con saldoPendiente = 0.
  let cxcCorregidas = 0;
  for (const f of facturas) {
    if (f.estado === "ANULADA") continue;
    const abonos = await prisma.pago.aggregate({
      where: { idFactura: f.id },
      _sum: { monto: true },
    });
    const pagado = abonos._sum.monto ?? 0;
    const saldo = Math.max(0, Number((f.totalFactura - pagado).toFixed(2)));
    const estado = saldo <= 0 ? "PAGADA" : saldo >= f.totalFactura ? "PENDIENTE" : "PARCIAL";
    if (Math.abs(saldo - f.saldoPendiente) > 0.01 || estado !== f.estado) {
      await prisma.factura.update({ where: { id: f.id }, data: { saldoPendiente: saldo, estado } });
      cxcCorregidas++;
    }
  }
  if (cxcCorregidas) console.log(`  - Facturas con cartera normalizada: ${cxcCorregidas}`);

  // 5b. Poda de asientos huerfanos: documentos origen que ya no existen.
  const idsPorTipo: Record<string, number[]> = {
    FACTURA: facturas.map((f) => f.id),
    COMPRA: compras.map((c) => c.id),
    NOTA: notas.map((n) => n.id),
    PAGO: pagos.map((p) => p.id),
  };
  let huerfanos = 0;
  for (const [tipoOrigen, ids] of Object.entries(idsPorTipo)) {
    const res = await prisma.asientoContable.deleteMany({
      where: { tipoOrigen, idOrigen: { notIn: ids.length ? ids : [-1] } },
    });
    huerfanos += res.count;
  }
  if (huerfanos) console.log(`  - Asientos huerfanos eliminados: ${huerfanos}`);

  // 6. Reporte de cuadre del libro diario.
  const asientos = await prisma.asientoContable.findMany({ include: { movimientos: true } });
  let descuadrados = 0;
  let totalD = 0;
  let totalC = 0;
  for (const a of asientos) {
    const d = a.movimientos.reduce((s, m) => s + m.debito, 0);
    const c = a.movimientos.reduce((s, m) => s + m.credito, 0);
    totalD += d;
    totalC += c;
    if (Math.abs(d - c) > 0.01) {
      descuadrados++;
      console.log(`    ! Asiento #${a.id} (${a.tipoOrigen}) descuadrado: D=${d} C=${c}`);
    }
  }
  const fmt = (n: number) => n.toLocaleString("es-CO");
  console.log(`\n== Libro diario: ${asientos.length} asientos ==`);
  console.log(`   Total debitos:  ${fmt(Math.round(totalD))}`);
  console.log(`   Total creditos: ${fmt(Math.round(totalC))}`);
  console.log(`   Asientos descuadrados: ${descuadrados}`);
  console.log(descuadrados === 0 ? "   OK: contabilidad cuadrada." : "   ERROR: hay asientos descuadrados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
