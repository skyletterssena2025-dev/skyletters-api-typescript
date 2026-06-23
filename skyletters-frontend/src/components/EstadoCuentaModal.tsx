import { useEffect, useState } from "react";
import Modal from "./Modal";
import { api } from "../api/client";

interface Props {
  cliente: any;
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

export default function EstadoCuentaModal({ cliente, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>(`/reportes/estado-cuenta/${cliente.id}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [cliente.id]);

  const facturas: any[] = data?.facturas ?? [];

  return (
    <Modal title={`Estado de cuenta — ${cliente.nombreCliente}`} onClose={onClose} wide>
      {loading ? (
        <div className="loading">
          <i className="fa-solid fa-spinner fa-spin" /> Cargando…
        </div>
      ) : (
        <>
          <div className="totals" style={{ width: "100%", marginTop: 0, marginBottom: 18 }}>
            <div className="totals-row">
              <span>Total facturado</span>
              <strong>{money(data?.totalFacturado ?? 0)}</strong>
            </div>
            <div className="totals-row grand">
              <span>Saldo pendiente</span>
              <strong>{money(data?.totalPendiente ?? 0)}</strong>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N° factura</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "right" }}>Saldo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {facturas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      Sin facturas.
                    </td>
                  </tr>
                ) : (
                  facturas.map((f) => (
                    <tr key={f.numeroFactura}>
                      <td>{f.numeroFactura}</td>
                      <td>{fdate(f.fecha ?? f.fechaFactura)}</td>
                      <td style={{ textAlign: "right" }}>{money(f.total ?? f.totalFactura)}</td>
                      <td style={{ textAlign: "right" }}>{money(f.saldoPendiente)}</td>
                      <td>
                        <span className={`badge ${Number(f.saldoPendiente) <= 0 ? "ok" : "off"}`}>
                          <span className="badge-dot" /> {f.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="actions">
            <button type="button" className="secondary" title="Cerrar" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
