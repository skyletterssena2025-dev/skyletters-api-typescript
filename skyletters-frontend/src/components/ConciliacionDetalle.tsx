import { useEffect, useState } from "react";
import Modal from "./Modal";
import { api } from "../api/client";
import { useToast } from "./Toast";

const money = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(n) || 0,
  );

const fecha = (v: any) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO");
};

interface LineaExtracto {
  fecha: string;
  descripcion: string;
  referencia?: string | null;
  valor: number | string;
}

const lineaVacia = (): LineaExtracto => ({ fecha: "", descripcion: "", referencia: "", valor: "" });

/**
 * Detalle de conciliacion bancaria: carga del extracto, cruce automatico
 * contra el libro (movimientos contables de banco) y resultado con diferencia.
 */
export default function ConciliacionDetalle({ conciliacion, onClose }: { conciliacion: any; onClose: () => void }) {
  const toast = useToast();
  const [detalle, setDetalle] = useState<any | null>(null);
  const [lineas, setLineas] = useState<LineaExtracto[]>([lineaVacia()]);
  const [busy, setBusy] = useState(false);

  async function cargar() {
    try {
      const d = await api<any>(`/conciliacion/${conciliacion.id}/detalle`);
      setDetalle(d);
      if (Array.isArray(d.extracto) && d.extracto.length) {
        setLineas(
          d.extracto.map((e: any) => ({
            fecha: String(e.fecha).slice(0, 10),
            descripcion: e.descripcion,
            referencia: e.referencia ?? "",
            valor: e.valor,
          })),
        );
      }
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo cargar el detalle");
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLinea(i: number, campo: keyof LineaExtracto, valor: string) {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  async function guardarExtracto() {
    const movimientos = lineas
      .filter((l) => l.descripcion && l.fecha && l.valor !== "")
      .map((l) => ({
        fecha: l.fecha,
        descripcion: l.descripcion,
        referencia: l.referencia || null,
        valor: Number(l.valor),
      }));
    if (!movimientos.length) {
      toast.error("Agrega al menos una línea válida del extracto");
      return;
    }
    setBusy(true);
    try {
      await api(`/conciliacion/${conciliacion.id}/extracto`, {
        method: "POST",
        body: JSON.stringify({ movimientos }),
      });
      toast.success("Extracto guardado");
      await cargar();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar el extracto");
    } finally {
      setBusy(false);
    }
  }

  async function conciliar() {
    setBusy(true);
    try {
      const d = await api<any>(`/conciliacion/${conciliacion.id}/conciliar`, { method: "POST" });
      setDetalle(d);
      toast.success(`Conciliación ejecutada: ${d.totales.conciliados} cruces`);
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo conciliar");
    } finally {
      setBusy(false);
    }
  }

  const t = detalle?.totales;

  return (
    <Modal title={`Conciliación · ${conciliacion.banco} · ${conciliacion.cuentaBancaria}`} onClose={onClose} wide>
      <div className="concil">
        <p className="page-sub">
          Periodo: {fecha(conciliacion.periodoInicio)} — {fecha(conciliacion.periodoFin)}
        </p>

        <h4 className="concil-h">1. Extracto bancario</h4>
        <table className="concil-edit">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Referencia</th>
              <th className="num">Valor (+ ingreso / − egreso)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={i}>
                <td><input type="date" value={l.fecha} onChange={(e) => setLinea(i, "fecha", e.target.value)} /></td>
                <td><input value={l.descripcion} onChange={(e) => setLinea(i, "descripcion", e.target.value)} placeholder="Concepto" /></td>
                <td><input value={l.referencia ?? ""} onChange={(e) => setLinea(i, "referencia", e.target.value)} placeholder="Ref." /></td>
                <td><input type="number" className="num" value={l.valor} onChange={(e) => setLinea(i, "valor", e.target.value)} placeholder="0" /></td>
                <td>
                  <button className="icon-btn danger" title="Quitar" onClick={() => setLineas((p) => p.filter((_, idx) => idx !== i))}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="concil-actions">
          <button className="link" onClick={() => setLineas((p) => [...p, lineaVacia()])}>
            <i className="fa-solid fa-plus" /> Agregar línea
          </button>
          <div className="spacer" />
          <button className="secondary" disabled={busy} onClick={guardarExtracto}>
            <i className="fa-solid fa-floppy-disk" /> Guardar extracto
          </button>
          <button disabled={busy} onClick={conciliar}>
            <i className="fa-solid fa-scale-balanced" /> Conciliar
          </button>
        </div>

        {t && (
          <>
            <h4 className="concil-h">2. Resultado</h4>
            <div className="concil-totales">
              <div><span>Saldo banco</span><strong>{money(t.saldoBancario)}</strong></div>
              <div><span>Saldo libro</span><strong>{money(t.saldoLibro)}</strong></div>
              <div className={Math.abs(t.diferencia) < 0.01 ? "ok" : "off"}>
                <span>Diferencia</span><strong>{money(t.diferencia)}</strong>
              </div>
              <div><span>Cruces</span><strong>{t.conciliados}</strong></div>
              <div><span>Pend. banco</span><strong>{t.pendientesBanco}</strong></div>
              <div><span>Pend. libro</span><strong>{t.pendientesLibro}</strong></div>
            </div>

            <div className="concil-cols">
              <div>
                <h5>Extracto ({detalle.extracto.length})</h5>
                <table className="concil-res">
                  <tbody>
                    {detalle.extracto.map((e: any) => (
                      <tr key={e.id}>
                        <td>{fecha(e.fecha)}</td>
                        <td>{e.descripcion}</td>
                        <td className="num">{money(e.valor)}</td>
                        <td>
                          <span className={`badge ${e.conciliado ? "ok" : "off"}`}>
                            <span className="badge-dot" /> {e.conciliado ? "Conciliado" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h5>Libro · banco ({detalle.libro.length})</h5>
                <table className="concil-res">
                  <tbody>
                    {detalle.libro.map((l: any) => (
                      <tr key={l.id}>
                        <td>{fecha(l.fecha)}</td>
                        <td>{l.descripcion}</td>
                        <td className="num">{money(l.valor)}</td>
                        <td>
                          <span className={`badge ${l.conciliado ? "ok" : "off"}`}>
                            <span className="badge-dot" /> {l.conciliado ? "Conciliado" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {detalle.libro.length === 0 && (
                      <tr><td colSpan={4} className="muted" style={{ textAlign: "center" }}>Sin movimientos de banco en el periodo.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
