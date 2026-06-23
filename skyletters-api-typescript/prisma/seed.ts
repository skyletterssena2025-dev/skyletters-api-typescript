import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PUC_SEED } from "../src/services/partidaDoble/cuentas";
import { ALL_PERMISOS_CSV } from "../src/config/permisos";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

/** Ejecuta el seeder solo si la tabla está vacía (idempotente, re-ejecutable). */
async function seedIfEmpty(
  label: string,
  count: () => Promise<number>,
  seed: () => Promise<number>,
): Promise<void> {
  const existing = await count();
  if (existing > 0) {
    console.log(`  - ${label}: ya tenía ${existing} registros, omitido`);
    return;
  }
  const created = await seed();
  console.log(`  -${label}: ${created} registros creados`);
}

async function main(): Promise<void> {
  console.log("Sembrando datos…");

  // ===== Rol + usuario administrador =====
  const hash = await bcrypt.hash("Admin123!", SALT_ROUNDS);
  // Administrador: TODOS los permisos del catalogo canonico.
  const permisos = ALL_PERMISOS_CSV;

  let rol = await prisma.rolesYPermisos.findFirst({ where: { nombre: "Administrador" } });
  if (!rol) {
    rol = await prisma.rolesYPermisos.create({
      data: {
        nombre: "Administrador",
        listaPermisos: permisos,
        listaRol: "Administrador",
        descripcion: "Rol con todos los permisos del sistema",
      },
    });
  } else {
    rol = await prisma.rolesYPermisos.update({
      where: { id: rol.id },
      data: { listaPermisos: permisos, listaRol: "Administrador" },
    });
  }

  const admin = await prisma.usuario.upsert({
    where: { correoUsuario: "admin@skyletters.com" },
    create: {
      nombreUsuario: "Admin",
      correoUsuario: "admin@skyletters.com",
      contrasenaUsuario: hash,
      rolUsuario: "Administrador",
      estadoUsuario: true,
      tipoUsuario: "admin",
    },
    update: {},
  });
  await prisma.usuarioAdmin.upsert({
    where: { idUsuario: admin.id },
    create: { idUsuario: admin.id, nivelConfidencialidad: "alto", permisosAdmin: permisos },
    update: {},
  });
  console.log(`  -admin: usuario #${admin.id}, rol #${rol.id}`);

  // ===== Rol Cliente (usado por los usuarios persona; antes faltaba en la tabla) =====
  const permisosCliente = "facturas,reportes";
  const rolClienteExistente = await prisma.rolesYPermisos.findFirst({ where: { nombre: "Cliente" } });
  if (!rolClienteExistente) {
    const rc = await prisma.rolesYPermisos.create({
      data: {
        nombre: "Cliente",
        listaPermisos: permisosCliente,
        listaRol: "Cliente",
        descripcion: "Cliente: consulta de sus facturas y reportes",
      },
    });
    console.log(`  -rol Cliente creado #${rc.id}`);
  } else {
    await prisma.rolesYPermisos.update({
      where: { id: rolClienteExistente.id },
      data: { listaRol: "Cliente" },
    });
  }

  // ===== Parametrización del sistema =====
  await seedIfEmpty(
    "parametrizacion",
    () => prisma.parametrizacionSistema.count(),
    async () => {
      await prisma.parametrizacionSistema.create({
        data: {
          nombreEmpresa: "Skyletters S.A.S.",
          direccionEmpresa: "Cra 7 # 32-16, Bogotá",
          telefonoEmpresa: "6015551234",
          anioInicialEmpresa: 2026,
          tipoMoneda: "COP",
          emailEmpresa: "contabilidad@skyletters.com",
          manejaImpuesto: true,
          impuestos: 2,
          cuentasContables: 0,
          documentoContable: "FACTURA",
        },
      });
      return 1;
    },
  );

  // ===== Impuestos =====
  await seedIfEmpty(
    "impuestos",
    () => prisma.impuesto.count(),
    async () => {
      const r = await prisma.impuesto.createMany({
        data: [
          { nombre: "IVA General", tipo: "venta", porcentaje: 19, fechaInicio: new Date("2026-01-01"), fechaFin: new Date("2026-12-31"), baseImponible: 0 },
          { nombre: "IVA Reducido", tipo: "venta", porcentaje: 5, fechaInicio: new Date("2026-01-01"), fechaFin: new Date("2026-12-31"), baseImponible: 0 },
          { nombre: "ReteFuente Servicios", tipo: "retencion", porcentaje: 11, fechaInicio: new Date("2026-01-01"), fechaFin: new Date("2026-12-31"), baseImponible: 0 },
          { nombre: "ReteICA Bogotá", tipo: "retencion", porcentaje: 0.966, fechaInicio: new Date("2026-01-01"), fechaFin: new Date("2026-12-31"), baseImponible: 0 },
          { nombre: "ReteIVA", tipo: "retencion_iva", porcentaje: 15, fechaInicio: new Date("2026-01-01"), fechaFin: new Date("2026-12-31"), baseImponible: 0 },
        ],
      });
      return r.count;
    },
  );

  // ===== Conciliación bancaria =====
  await seedIfEmpty(
    "conciliacion",
    () => prisma.conciliacionBancaria.count(),
    async () => {
      const r = await prisma.conciliacionBancaria.createMany({
        data: [
          { cuentaBancaria: "1234567890", banco: "Bancolombia", periodoInicio: new Date("2026-05-01"), periodoFin: new Date("2026-05-31"), movimientosConciliados: 42, saldoBancario: 15800000, saldoContable: 15800000 },
          { cuentaBancaria: "9876543210", banco: "Davivienda", periodoInicio: new Date("2026-05-01"), periodoFin: new Date("2026-05-31"), movimientosConciliados: 18, saldoBancario: 7250000, saldoContable: 7180000 },
          { cuentaBancaria: "5551112223", banco: "BBVA", periodoInicio: new Date("2026-06-01"), periodoFin: new Date("2026-06-30"), movimientosConciliados: 0, saldoBancario: 3000000, saldoContable: 3000000 },
        ],
      });
      return r.count;
    },
  );

  // ===== Reportes financieros =====
  await seedIfEmpty(
    "reportes",
    () => prisma.reporteFinanciero.count(),
    async () => {
      const r = await prisma.reporteFinanciero.createMany({
        data: [
          { tipo: "Balance General", formato: "PDF", movimientoContable: "Activos/Pasivos/Patrimonio", descripcion: "Balance general a corte de mayo 2026", periodoInicio: new Date("2026-01-01"), periodoFin: new Date("2026-05-31") },
          { tipo: "Estado de Resultados", formato: "EXCEL", movimientoContable: "Ingresos/Egresos", descripcion: "P&G primer semestre 2026", periodoInicio: new Date("2026-01-01"), periodoFin: new Date("2026-06-30") },
          { tipo: "Flujo de Caja", formato: "PDF", movimientoContable: "Entradas/Salidas", descripcion: "Flujo de caja mensual mayo", periodoInicio: new Date("2026-05-01"), periodoFin: new Date("2026-05-31") },
        ],
      });
      return r.count;
    },
  );

  // ===== Personas (requeridas por Facturas) =====
  await seedIfEmpty(
    "personas",
    () => prisma.persona.count(),
    async () => {
      const personasSeed = [
        { nombre: "Laura", apellido: "Gómez", correo: "laura.gomez@example.com", genero: "F", direccion: "Calle 10 # 5-20", telefono: "3001112233", nacimiento: "1992-04-15" },
        { nombre: "Carlos", apellido: "Pérez", correo: "carlos.perez@example.com", genero: "M", direccion: "Av 68 # 40-11", telefono: "3014445566", nacimiento: "1988-11-02" },
        { nombre: "Mariana", apellido: "Rojas", correo: "mariana.rojas@example.com", genero: "F", direccion: "Cra 15 # 93-50", telefono: "3027778899", nacimiento: "1995-07-28" },
      ];
      let count = 0;
      for (const p of personasSeed) {
        const pwd = await bcrypt.hash("Cliente123!", SALT_ROUNDS);
        const u = await prisma.usuario.create({
          data: {
            nombreUsuario: `${p.nombre} ${p.apellido}`,
            correoUsuario: p.correo,
            contrasenaUsuario: pwd,
            rolUsuario: "Cliente",
            estadoUsuario: true,
            tipoUsuario: "aux",
          },
        });
        await prisma.persona.create({
          data: {
            idUsuario: u.id,
            nombrePersona: p.nombre,
            apellidoPersona: p.apellido,
            correoPersona: p.correo,
            direccionPersona: p.direccion,
            telefonoPersona: p.telefono,
            generoPersona: p.genero,
            fechaNacimientoPersona: p.nacimiento,
          },
        });
        count++;
      }
      return count;
    },
  );

  // ===== Clientes (requeridos por Facturas) =====
  await seedIfEmpty(
    "clientes",
    () => prisma.cliente.count(),
    async () => {
      const r = await prisma.cliente.createMany({
        data: [
          { nombreCliente: "Comercializadora Andina", razonSocial: "Comercializadora Andina S.A.S.", nitCliente: "900123456-7", correoCliente: "compras@andina.co", direccionCliente: "Cra 50 # 12-30", telefonoCliente: "6014567890", ciudadCliente: "Bogotá" },
          { nombreCliente: "Tecno Soluciones", razonSocial: "Tecno Soluciones Ltda.", nitCliente: "901987654-3", correoCliente: "info@tecnosol.co", direccionCliente: "Calle 80 # 20-15", telefonoCliente: "6017654321", ciudadCliente: "Medellín" },
          { nombreCliente: "Distribuidora El Sol", razonSocial: "Distribuidora El Sol S.A.", nitCliente: "830111222-9", correoCliente: "ventas@elsol.co", direccionCliente: "Av 30 # 5-44", telefonoCliente: "6012223334", ciudadCliente: "Cali" },
        ],
      });
      return r.count;
    },
  );

  // ===== Facturas (asociadas a los clientes creados) =====
  await seedIfEmpty(
    "facturas",
    () => prisma.factura.count(),
    async () => {
      const clientes = await prisma.cliente.findMany({ orderBy: { id: "asc" }, take: 3 });
      if (clientes.length === 0) return 0;
      const facturas = [
        { numeroFactura: 1001, detalle: "Servicio de contabilidad mensual", subtotal: 500000, formaPago: "Transferencia" },
        { numeroFactura: 1002, detalle: "Asesoría tributaria", subtotal: 800000, formaPago: "Efectivo" },
        { numeroFactura: 1003, detalle: "Auditoría externa", subtotal: 1200000, formaPago: "Tarjeta" },
        { numeroFactura: 1004, detalle: "Declaración de renta", subtotal: 350000, formaPago: "Transferencia" },
      ];
      let count = 0;
      for (let i = 0; i < facturas.length; i++) {
        const f = facturas[i];
        const cliente = clientes[i % clientes.length];
        const impuesto = Math.round(f.subtotal * 0.19);
        const total = f.subtotal + impuesto;
        await prisma.factura.create({
          data: {
            numeroFactura: f.numeroFactura,
            idCliente: cliente.id,
            fechaFactura: new Date(`2026-06-${String(10 + i).padStart(2, "0")}`),
            detalleProducto: f.detalle,
            subtotalFactura: f.subtotal,
            impuestoFactura: impuesto,
            totalFactura: total,
            formaPago: f.formaPago,
            // Cartera: la factura nace PENDIENTE con saldo = total.
            estado: "PENDIENTE",
            saldoPendiente: total,
          },
        });
        count++;
      }
      return count;
    },
  );

  // ===== Proveedores =====
  await seedIfEmpty(
    "proveedores",
    () => prisma.proveedor.count(),
    async () => {
      const r = await prisma.proveedor.createMany({
        data: [
          { nombreProveedor: "Papelería Global", razonSocial: "Papelería Global S.A.S.", nitProveedor: "860333444-1", correoProveedor: "ventas@papeleriaglobal.co", direccionProveedor: "Cra 13 # 60-22", telefonoProveedor: "6013334445", ciudadProveedor: "Bogotá" },
          { nombreProveedor: "Suministros TI", razonSocial: "Suministros TI Ltda.", nitProveedor: "900555666-2", correoProveedor: "contacto@suministrosti.co", direccionProveedor: "Calle 100 # 11-50", telefonoProveedor: "6015556667", ciudadProveedor: "Bogotá" },
        ],
      });
      return r.count;
    },
  );

  // ===== Productos =====
  await seedIfEmpty(
    "productos",
    () => prisma.producto.count(),
    async () => {
      const r = await prisma.producto.createMany({
        data: [
          { codigoProducto: "SRV-001", nombreProducto: "Asesoría contable (hora)", descripcionProducto: "Hora de asesoría contable profesional", precioProducto: 120000, cantidadProducto: 999 },
          { codigoProducto: "SRV-002", nombreProducto: "Declaración de renta", descripcionProducto: "Elaboración y presentación de declaración de renta", precioProducto: 350000, cantidadProducto: 999 },
          { codigoProducto: "SRV-003", nombreProducto: "Auditoría financiera", descripcionProducto: "Auditoría financiera anual", precioProducto: 2500000, cantidadProducto: 50 },
        ],
      });
      return r.count;
    },
  );

  // ===== Asientos contables =====
  await seedIfEmpty(
    "asientos",
    () => prisma.asientoContable.count(),
    async () => {
      const r = await prisma.asientoContable.createMany({
        data: [
          { fechaCreacionRegistro: new Date("2026-06-10"), numeroFactura: 1001, descripcion: "Registro venta servicio contabilidad", usuarioCreador: "admin@skyletters.com", fechaModificacion: new Date("2026-06-10"), listaMovimiContable: "Caja:595000;Ingresos:500000;IVA:95000" },
          { fechaCreacionRegistro: new Date("2026-06-11"), numeroFactura: 1002, descripcion: "Registro venta asesoría tributaria", usuarioCreador: "admin@skyletters.com", fechaModificacion: new Date("2026-06-11"), listaMovimiContable: "Bancos:952000;Ingresos:800000;IVA:152000" },
        ],
      });
      return r.count;
    },
  );

  // ===== Plan Unico de Cuentas (PUC) =====
  await seedIfEmpty(
    "cuentas PUC",
    () => prisma.cuentaPUC.count(),
    async () => {
      const r = await prisma.cuentaPUC.createMany({ data: PUC_SEED });
      return r.count;
    },
  );

  // ===== Resoluciones de facturación (DIAN) =====
  await seedIfEmpty(
    "resoluciones",
    () => prisma.resolucionFacturacion.count(),
    async () => {
      const r = await prisma.resolucionFacturacion.createMany({
        data: [
          { tipoDocumento: "FACTURA_VENTA", resolucion: "18764000000001", codigoAutorizacion: "ABC123456789", prefijo: "FE", numeroInicial: 1000, numeroFinal: 5000, vigenciaDesde: new Date("2026-01-01"), vigenciaHasta: new Date("2027-01-01"), estado: true },
          { tipoDocumento: "NOTA_CREDITO", resolucion: "18764000000002", codigoAutorizacion: "NC987654321", prefijo: "NC", numeroInicial: 1, numeroFinal: 1000, vigenciaDesde: new Date("2026-01-01"), vigenciaHasta: new Date("2027-01-01"), estado: true },
          { tipoDocumento: "NOTA_DEBITO", resolucion: "18764000000003", codigoAutorizacion: "ND111222333", prefijo: "ND", numeroInicial: 1, numeroFinal: 1000, vigenciaDesde: new Date("2026-01-01"), vigenciaHasta: new Date("2027-01-01"), estado: true },
        ],
      });
      return r.count;
    },
  );

  console.log("Seed completado.");
  console.log("Credenciales por defecto: admin@skyletters.com / Admin123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
