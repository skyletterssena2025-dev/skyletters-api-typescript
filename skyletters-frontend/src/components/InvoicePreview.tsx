import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { api } from "../api/client";

interface Props {
  factura: any;
  onClose: () => void;
}

const money = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    isNaN(Number(n)) ? 0 : Number(n),
  );

const fdate = (v: any) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v ?? "") : d.toLocaleDateString("es-CO");
};

interface Item {
  nombre: string;
  cantidad: number;
  precio: number;
  descuento?: number;
}

function parseDetalle(raw: any): { items: Item[]; impuestos: any[] } {
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return { items: p, impuestos: [] };
    return { items: p.items ?? [], impuestos: p.impuestos ?? [] };
  } catch {
    return { items: [{ nombre: String(raw ?? ""), cantidad: 1, precio: 0 }], impuestos: [] };
  }
}

// CSS embebido para la ventana de impresión (PDF en blanco).
const PRINT_CSS = `
  * { box-sizing: border-box; font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; }
  body { margin: 0; padding: 32px; color: #1e293b; }
  .invoice-paper { max-width: 760px; margin: 0 auto; }
  .inv-top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 20px; }
  .inv-empresa { font-size: 20px; font-weight: 800; color: #1e3a8a; }
  .inv-empresa small { display: block; font-size: 12px; font-weight: 400; color: #64748b; margin-top: 4px; }
  .inv-doc { text-align: right; }
  .inv-doc .lbl { font-size: 11px; letter-spacing: .08em; color: #2563eb; font-weight: 700; }
  .inv-doc .num { font-size: 22px; font-weight: 800; }
  .inv-doc .meta { font-size: 12px; color: #64748b; }
  .inv-cliente { margin-bottom: 18px; font-size: 13px; }
  .inv-cliente .t { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: .06em; margin-bottom: 4px; }
  .inv-cliente .n { font-weight: 700; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
  th { background: #1e3a8a; color: #fff; text-align: left; padding: 8px 10px; }
  th.r, td.r { text-align: right; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  .inv-tot { margin-left: auto; width: 300px; font-size: 13px; }
  .inv-tot .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .inv-tot .ret { color: #b91c1c; }
  .inv-tot .grand { border-top: 2px solid #1e3a8a; margin-top: 6px; padding-top: 8px; font-size: 18px; font-weight: 800; color: #1e3a8a; }
  .inv-foot { margin-top: 28px; font-size: 11px; color: #94a3b8; text-align: center; }
`;

export default function InvoicePreview({ factura, onClose }: Props) {
  const [empresa, setEmpresa] = useState<any>(null);
  const [resolucion, setResolucion] = useState<any>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<any>("/parametrizacion/current").then(setEmpresa).catch(() => {});
    api<any[]>("/resoluciones")
      .then((list) => {
        const r = (list ?? []).find(
          (x) => x.tipoDocumento === "FACTURA_VENTA" && x.estado,
        );
        setResolucion(r ?? null);
      })
      .catch(() => {});
  }, []);

  const parsed = parseDetalle(factura.detalleProducto);
  // Preferir las líneas persistidas (FacturaDetalle); si no, el JSON.
  const items: Item[] =
    Array.isArray(factura.detalles) && factura.detalles.length ? factura.detalles : parsed.items;
  const impuestos = parsed.impuestos;
  const cliente = factura.cliente ?? {};

  function printPdf() {
    const node = paperRef.current;
    if (!node) return;
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    w.document.write(
      `<html><head><title>Factura ${factura.numeroFactura}</title><style>${PRINT_CSS}</style></head><body>${node.outerHTML}</body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <Modal title={`Factura N° ${factura.numeroFactura}`} onClose={onClose} wide>
      <div className="invoice-preview-scroll">
        <div className="invoice-paper" ref={paperRef}>
          <div className="inv-top">
            <div className="inv-empresa">
              {empresa?.nombreEmpresa ?? "Mi empresa"}
              <small>
                {empresa?.direccionEmpresa}
                {empresa?.telefonoEmpresa ? ` · Tel ${empresa.telefonoEmpresa}` : ""}
                {empresa?.emailEmpresa ? ` · ${empresa.emailEmpresa}` : ""}
              </small>
            </div>
            <div className="inv-doc">
              <div className="lbl">FACTURA DE VENTA</div>
              <div className="num">N° {factura.numeroFactura}</div>
              <div className="meta">{fdate(factura.fechaFactura)}</div>
              <div className="meta">Pago: {factura.formaPago}</div>
            </div>
          </div>

          <div className="inv-cliente">
            <div className="t">Cliente</div>
            <div className="n">{cliente.nombreCliente ?? "—"}</div>
            <div>
              {cliente.razonSocial ? `${cliente.razonSocial} · ` : ""}
              {cliente.nitCliente ? `NIT ${cliente.nitCliente}` : ""}
            </div>
            <div>
              {cliente.direccionCliente}
              {cliente.ciudadCliente ? `, ${cliente.ciudadCliente}` : ""}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th className="r">Cant.</th>
                <th className="r">Precio</th>
                <th className="r">Desc%</th>
                <th className="r">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.nombre}</td>
                  <td className="r">{it.cantidad}</td>
                  <td className="r">{money(it.precio)}</td>
                  <td className="r">{it.descuento ? `${it.descuento}%` : "—"}</td>
                  <td className="r">
                    {money(it.cantidad * it.precio * (1 - (Number(it.descuento) || 0) / 100))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="inv-tot">
            <div className="row">
              <span>Subtotal</span>
              <span>{money(factura.subtotalFactura)}</span>
            </div>
            {impuestos.map((t: any, i: number) => (
              <div className="row" key={i}>
                <span>
                  {t.esRetencion ? "− " : "+ "}
                  {t.nombre} ({t.porcentaje}%)
                </span>
                <span className={t.esRetencion ? "ret" : ""}>
                  {t.esRetencion ? "−" : ""}
                  {money(t.monto)}
                </span>
              </div>
            ))}
            <div className="row grand">
              <span>Total</span>
              <span>{money(factura.totalFactura)}</span>
            </div>
          </div>

          {resolucion && (
            <div className="inv-foot">
              Resolución DIAN N° {resolucion.resolucion}
              {resolucion.codigoAutorizacion ? ` · Autorización ${resolucion.codigoAutorizacion}` : ""} ·
              Numeración {resolucion.prefijo ?? ""} {resolucion.numeroInicial} al {resolucion.numeroFinal} ·
              Vigente {fdate(resolucion.vigenciaDesde)} – {fdate(resolucion.vigenciaHasta)}
            </div>
          )}
          <div className="inv-foot">Generado por Skyletters · {fdate(new Date().toISOString())}</div>
        </div>
      </div>

      <div className="actions">
        <button type="button" className="secondary" title="Cerrar" onClick={onClose}>
          Cerrar
        </button>
        <button type="button" title="Imprimir / Guardar PDF" onClick={printPdf}>
          <i className="fa-solid fa-file-pdf" /> Imprimir / Guardar PDF
        </button>
      </div>
    </Modal>
  );
}
