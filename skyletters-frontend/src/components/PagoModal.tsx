import { useEffect, useState, type FormEvent } from "react";
import Modal from "./Modal";
import { api } from "../api/client";

interface Props {
  factura: any;
  onCancel: () => void;
  onDone: () => void;
}

const money = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    isNaN(Number(n)) ? 0 : Number(n),
  );

export default function PagoModal({ factura, onCancel, onDone }: Props) {
  const saldo = Number(factura.saldoPendiente ?? 0);
  const [monto, setMonto] = useState(String(saldo));
  const [formaPago, setFormaPago] = useState("Efectivo");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");
  const [pagos, setPagos] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<any[]>(`/pagos?idFactura=${factura.id}`).then((d) => setPagos(d ?? [])).catch(() => {});
  }, [factura.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api("/pagos", {
        method: "POST",
        body: JSON.stringify({
          idFactura: factura.id,
          monto: Number(monto),
          formaPago,
          fecha,
          nota: nota || undefined,
        }),
      });
      onDone();
    } catch (err: any) {
      setError(err?.message ?? "No se pudo registrar el abono");
      setSaving(false);
    }
  }

  return (
    <Modal title={`Registrar abono — Factura N° ${factura.numeroFactura}`} onClose={onCancel}>
      {error && (
        <p className="error-msg">
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </p>
      )}

      <div className="totals" style={{ width: "100%", marginTop: 0 }}>
        <div className="totals-row">
          <span>Total factura</span>
          <strong>{money(factura.totalFactura)}</strong>
        </div>
        <div className="totals-row grand">
          <span>Saldo pendiente</span>
          <strong>{money(saldo)}</strong>
        </div>
      </div>

      {saldo <= 0 ? (
        <p style={{ color: "var(--success)", marginTop: 16 }}>
          <i className="fa-solid fa-circle-check" /> Esta factura ya está pagada.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="grid2">
            <div className="field">
              <label>Monto del abono</label>
              <input
                type="number"
                min={1}
                max={saldo}
                step="any"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Forma de pago</label>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tarjeta</option>
                <option>Cheque</option>
              </select>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div className="field">
              <label>Nota (opcional)</label>
              <input value={nota} onChange={(e) => setNota(e.target.value)} />
            </div>
          </div>
          <div className="actions">
            <button type="button" className="secondary" title="Cancelar" onClick={onCancel} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" title="Guardar" disabled={saving}>
              {saving ? "Guardando…" : "Registrar abono"}
            </button>
          </div>
        </form>
      )}

      {pagos.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="form-section-title">Abonos registrados</div>
          <table className="items-table" style={{ width: "100%" }}>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.fecha).toLocaleDateString("es-CO")}</td>
                  <td>{p.formaPago}</td>
                  <td className="num" style={{ textAlign: "right" }}>{money(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
