import { useEffect, useMemo, useState, type FormEvent } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Modal from "./Modal";
import { api } from "../api/client";

interface Producto {
  id: number;
  nombreProducto: string;
  precioProducto: number;
}
interface Impuesto {
  id: number;
  nombre: string;
  porcentaje: number;
  tipo: string;
  baseImponible?: number; // se usa como base mínima de retención
}

interface FacturaOrigen {
  id: number;
  numeroFactura: number | string;
  idCliente: number;
  totalFactura: number;
  cliente?: {
    id: number;
    nombreCliente: string;
    nitCliente: string;
    impuestosAplicables?: string;
  };
}

interface LineItem {
  idProducto: string;
  nombre: string;
  cantidad: number;
  precio: number;
  descuento: number; // % por línea
}

interface Props {
  initial?: Record<string, any> | null;
  onCancel: () => void;
  onSubmit: (values: Record<string, any>) => Promise<void>;
}

type TipoNota = "CREDITO" | "DEBITO";

const MOTIVOS = ["Devolución", "Anulación", "Descuento", "Corrección de valor", "Otro"];

const money = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    isNaN(n) ? 0 : n,
  );

const lineTotal = (it: LineItem) =>
  it.cantidad * it.precio * (1 - (Number(it.descuento) || 0) / 100);

function toDateInput(value: any): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

const emptyItem = (): LineItem => ({ idProducto: "", nombre: "", cantidad: 1, precio: 0, descuento: 0 });

// Reconstruye las líneas desde detalleProducto (JSON: array o {items,...}) o texto plano (seed).
function parseItems(initial: Record<string, any> | null | undefined): LineItem[] {
  if (!initial) return [emptyItem()];
  const mapItem = (p: any): LineItem => ({
    idProducto: String(p.idProducto ?? ""),
    nombre: p.nombre ?? "",
    cantidad: Number(p.cantidad ?? 1),
    precio: Number(p.precio ?? 0),
    descuento: Number(p.descuento ?? 0),
  });
  // Preferir las líneas persistidas en la tabla de detalle.
  if (Array.isArray(initial.detalles) && initial.detalles.length) {
    return initial.detalles.map(mapItem);
  }
  const raw = initial.detalleProducto;
  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : parsed?.items;
    if (Array.isArray(arr) && arr.length) return arr.map(mapItem);
  } catch {
    /* texto plano del seed */
  }
  return [{ ...emptyItem(), nombre: raw ?? "", precio: Number(initial.subtotal ?? 0) }];
}

export default function NotaForm({ initial, onCancel, onSubmit }: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
  const [facturas, setFacturas] = useState<FacturaOrigen[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);

  const [tipo, setTipo] = useState<TipoNota>((initial?.tipo as TipoNota) ?? "CREDITO");
  const [numero, setNumero] = useState(String(initial?.numero ?? ""));
  const [idFactura, setIdFactura] = useState(String(initial?.idFactura ?? ""));
  const [fecha, setFecha] = useState(toDateInput(initial?.fecha));
  const [motivo, setMotivo] = useState(initial?.motivo ?? "");
  const [items, setItems] = useState<LineItem[]>(() => parseItems(initial));

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Producto[]>("/productos").then((d) => setProductos(d ?? [])).catch(() => {});
    api<Impuesto[]>("/impuestos").then((d) => setImpuestos(d ?? [])).catch(() => {});
    api<FacturaOrigen[]>("/facturas").then((d) => setFacturas(d ?? [])).catch(() => {});
    api<any>("/parametrizacion/current").then((d) => setEmpresa(d)).catch(() => {});
  }, []);

  // Numeración consecutiva automática según el tipo de nota (recarga al cambiar tipo).
  useEffect(() => {
    if (initial) return;
    api<{ numero: number }>(`/notas/next-number?tipo=${tipo}`)
      .then((d) => setNumero(String(d.numero)))
      .catch(() => {});
  }, [tipo, initial]);

  const subtotal = useMemo(() => items.reduce((acc, it) => acc + lineTotal(it), 0), [items]);

  // Factura origen seleccionada; el cliente y sus impuestos provienen de ella.
  const facturaSel = facturas.find((f) => String(f.id) === idFactura);
  const idCliente = facturaSel ? facturaSel.idCliente : null;
  const clienteImpuestos = facturaSel?.cliente?.impuestosAplicables ?? "";

  // IVA suma; retención normal resta (sobre subtotal, con base mínima); ReteIVA resta sobre el IVA.
  const appliedTaxes = useMemo(() => {
    const ids = clienteImpuestos
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const taxes = ids
      .map((id) => impuestos.find((i) => String(i.id) === id))
      .filter((i): i is Impuesto => Boolean(i));

    const result: {
      id: number;
      nombre: string;
      porcentaje: number;
      esRetencion: boolean;
      monto: number;
      aplica: boolean;
      base: "subtotal" | "iva";
    }[] = [];

    // Paso 1: impuestos que suman (IVA / venta) -> acumulan el IVA total.
    let ivaTotal = 0;
    for (const i of taxes) {
      const tipoImp = (i.tipo || "").toLowerCase();
      if (tipoImp.includes("retenc")) continue;
      const monto = Math.round((subtotal * i.porcentaje) / 100);
      ivaTotal += monto;
      result.push({ id: i.id, nombre: i.nombre, porcentaje: i.porcentaje, esRetencion: false, monto, aplica: true, base: "subtotal" });
    }

    // Paso 2: retenciones (restan). ReteIVA usa el IVA como base; las demás el subtotal con base mínima.
    for (const i of taxes) {
      const tipoImp = (i.tipo || "").toLowerCase();
      if (!tipoImp.includes("retenc")) continue;
      const esReteIva = tipoImp.includes("iva");
      if (esReteIva) {
        const monto = Math.round((ivaTotal * i.porcentaje) / 100);
        result.push({ id: i.id, nombre: i.nombre, porcentaje: i.porcentaje, esRetencion: true, monto, aplica: ivaTotal > 0, base: "iva" });
      } else {
        const baseMin = Number(i.baseImponible || 0);
        const aplica = subtotal >= baseMin;
        const monto = aplica ? Math.round((subtotal * i.porcentaje) / 100) : 0;
        result.push({ id: i.id, nombre: i.nombre, porcentaje: i.porcentaje, esRetencion: true, monto, aplica, base: "subtotal" });
      }
    }
    return result;
  }, [clienteImpuestos, impuestos, subtotal]);

  const impuestoNeto = appliedTaxes.reduce((acc, t) => acc + (t.esRetencion ? -t.monto : t.monto), 0);
  const total = subtotal + impuestoNeto;

  const badgeLabel = tipo === "CREDITO" ? "NOTA CRÉDITO" : "NOTA DÉBITO";

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function onSelectProducto(idx: number, producto: Producto | null) {
    updateItem(idx, {
      idProducto: producto ? String(producto.id) : "",
      nombre: producto?.nombreProducto ?? items[idx].nombre,
      precio: producto ? Number(producto.precioProducto) : items[idx].precio,
    });
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(idx: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const validItems = items.filter((it) => it.nombre.trim() && it.cantidad > 0);
    if (!idFactura || idCliente == null) return setError("Selecciona una factura origen.");
    if (!motivo) return setError("Selecciona un motivo.");
    if (validItems.length === 0) return setError("Agrega al menos un artículo.");
    setSaving(true);
    try {
      const detalles = validItems.map((it) => ({
        nombre: it.nombre,
        idProducto: it.idProducto ? Number(it.idProducto) : null,
        cantidad: Number(it.cantidad),
        precio: Number(it.precio),
        descuento: Number(it.descuento) || 0,
        subtotal: lineTotal(it),
      }));
      await onSubmit({
        tipo,
        numero: Number(numero),
        idFactura: Number(idFactura),
        idCliente: Number(idCliente),
        fecha,
        motivo,
        detalles,
        detalleProducto: JSON.stringify({ items: validItems, impuestos: appliedTaxes }),
        subtotal,
        impuesto: impuestoNeto,
        total,
      });
    } catch (err: any) {
      setError(err?.message ?? "Error al guardar");
      setSaving(false);
    }
  }

  return (
    <Modal title={`${initial ? "Editar" : "Nueva"} nota ${tipo === "CREDITO" ? "crédito" : "débito"}`} onClose={onCancel} wide>
      {error && (
        <p className="error-msg">
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="invoice-doc-head">
          <div className="invoice-empresa">
            <div className="invoice-empresa-name">{empresa?.nombreEmpresa ?? "Mi empresa"}</div>
            <div className="invoice-empresa-meta">
              {empresa?.direccionEmpresa}
              {empresa?.telefonoEmpresa ? ` · Tel ${empresa.telefonoEmpresa}` : ""}
            </div>
          </div>
          <div className="invoice-doc-badge">
            <span>{badgeLabel}</span>
            <strong>N° {numero || "—"}</strong>
            {facturaSel && <em>Sobre factura N° {facturaSel.numeroFactura}</em>}
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Tipo de nota</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoNota)} required>
              <option value="CREDITO">Crédito</option>
              <option value="DEBITO">Débito</option>
            </select>
          </div>
          <div className="field">
            <label>N° nota</label>
            <input
              type="number"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Factura origen</label>
            <select value={idFactura} onChange={(e) => setIdFactura(e.target.value)} required>
              <option value="">— Seleccionar —</option>
              {facturas.map((f) => (
                <option key={f.id} value={f.id}>
                  N° {f.numeroFactura} — {f.cliente?.nombreCliente ?? "Sin cliente"}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Motivo</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} required>
              <option value="">— Seleccionar —</option>
              {MOTIVOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>
          <div className="field">
            <label>Cliente</label>
            <input
              type="text"
              value={facturaSel?.cliente?.nombreCliente ?? ""}
              placeholder="Se toma de la factura origen"
              readOnly
              disabled
            />
          </div>
        </div>

        <div className="line-items">
          <div className="line-head">
            <span>Artículos</span>
            <button type="button" className="secondary" title="Agregar artÃ­culo" onClick={addItem}>
              <i className="fa-solid fa-plus" /> Agregar artículo
            </button>
          </div>
          <div className="items-grid">
            <div className="items-grid-head">
              <span>Producto / descripción</span>
              <span>Cant.</span>
              <span>Precio</span>
              <span>Desc %</span>
              <span className="ig-num">Subtotal</span>
              <span></span>
            </div>
            {items.map((it, idx) => (
              <div className="items-grid-row" key={idx}>
                <div className="ig-prod">
                  <Autocomplete
                    size="small"
                    options={productos}
                    getOptionLabel={(p) => p.nombreProducto}
                    value={productos.find((p) => String(p.id) === it.idProducto) ?? null}
                    onChange={(_e, val) => onSelectProducto(idx, val)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Buscar producto…" />
                    )}
                  />
                  {!it.idProducto && (
                    <input
                      className="item-desc"
                      placeholder="Descripción del ítem (texto libre)"
                      value={it.nombre}
                      onChange={(e) => updateItem(idx, { nombre: e.target.value })}
                    />
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  value={it.cantidad}
                  onChange={(e) => updateItem(idx, { cantidad: Number(e.target.value) })}
                />
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={it.precio}
                  onChange={(e) => updateItem(idx, { precio: Number(e.target.value) })}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={it.descuento}
                  onChange={(e) => updateItem(idx, { descuento: Number(e.target.value) })}
                />
                <span className="ig-num">{money(lineTotal(it))}</span>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => removeItem(idx)}
                  title="Quitar" aria-label="Quitar"
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="totals">
          <div className="totals-row">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>

          {!facturaSel && (
            <div className="totals-note">Selecciona una factura origen para aplicar sus impuestos.</div>
          )}
          {facturaSel && appliedTaxes.length === 0 && (
            <div className="totals-note">
              <i className="fa-solid fa-circle-info" /> El cliente de esta factura no tiene impuestos configurados.
              Configúralos en el módulo Clientes.
            </div>
          )}
          {appliedTaxes.map((t) => (
            <div className="totals-row tax" key={t.id}>
              <span>
                {t.esRetencion ? "− " : "+ "}
                {t.nombre} ({t.porcentaje}%{t.base === "iva" ? " s/IVA" : ""})
                {!t.aplica && <em className="no-aplica"> · no aplica (base mín.)</em>}
              </span>
              <span className={t.esRetencion ? "ret" : ""}>
                {t.esRetencion ? "−" : ""}
                {money(t.monto)}
              </span>
            </div>
          ))}

          <div className="totals-row grand">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
        </div>

        <div className="actions">
          <button type="button" className="secondary" title="Cancelar" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" title="Guardar" disabled={saving}>
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Guardando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk" /> Guardar nota
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
