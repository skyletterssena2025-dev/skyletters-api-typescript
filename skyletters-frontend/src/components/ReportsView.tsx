import { useEffect, useState } from "react";
import { api } from "../api/client";

const money = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    isNaN(Number(n)) ? 0 : Number(n),
  );

export default function ReportsView() {
  const year = new Date().getUTCFullYear();
  const [cartera, setCartera] = useState<any>(null);
  const [desde, setDesde] = useState(`${year}-01-01`);
  const [fin, setFin] = useState(`${year}-12-31`);
  const [ventas, setVentas] = useState<any>(null);
  const [loadingV, setLoadingV] = useState(false);

  useEffect(() => {
    api<any>("/reportes/cartera").then(setCartera).catch(() => setCartera(null));
    consultarVentas(`${year}-01-01`, `${year}-12-31`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function consultarVentas(d = desde, f = fin) {
    setLoadingV(true);
    try {
      const data = await api<any>(`/reportes/ventas?desde=${d}&fin=${f}`);
      setVentas(data);
    } catch {
      setVentas(null);
    } finally {
      setLoadingV(false);
    }
  }

  const tot = ventas?.totales ?? ventas ?? {};
  const carteraClientes: any[] = cartera?.clientes ?? [];

  return (
    <>
      <header className="page-head">
        <div>
          <h2>
            <i className="fa-solid fa-chart-line" /> Reportes
          </h2>
          <span className="page-sub">Indicadores financieros en tiempo real</span>
        </div>
      </header>

      {/* Ventas por período */}
      <div className="report-block">
        <div className="report-head">
          <h3>Ventas por período</h3>
          <div className="report-filters">
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            <span>a</span>
            <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
            <button title="Consultar" onClick={() => consultarVentas()} disabled={loadingV}>
              <i className="fa-solid fa-magnifying-glass" /> Consultar
            </button>
          </div>
        </div>
        <div className="kpi-row">
          <div className="kpi-card kpi-blue">
            <div className="kpi-icon"><i className="fa-solid fa-file-invoice" /></div>
            <div className="kpi-body">
              <div className="kpi-label">Facturas</div>
              <div className="kpi-value">{tot.count ?? 0}</div>
            </div>
          </div>
          <div className="kpi-card kpi-cyan">
            <div className="kpi-icon"><i className="fa-solid fa-receipt" /></div>
            <div className="kpi-body">
              <div className="kpi-label">Subtotal</div>
              <div className="kpi-value">{money(tot.subtotal ?? 0)}</div>
            </div>
          </div>
          <div className="kpi-card kpi-amber">
            <div className="kpi-icon"><i className="fa-solid fa-percent" /></div>
            <div className="kpi-body">
              <div className="kpi-label">Impuestos</div>
              <div className="kpi-value">{money(tot.impuesto ?? 0)}</div>
            </div>
          </div>
          <div className="kpi-card kpi-green">
            <div className="kpi-icon"><i className="fa-solid fa-coins" /></div>
            <div className="kpi-body">
              <div className="kpi-label">Total vendido</div>
              <div className="kpi-value">{money(tot.total ?? 0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cartera por cobrar */}
      <div className="report-block">
        <div className="report-head">
          <h3>Cartera por cobrar</h3>
          <span className="cartera-total">
            Total pendiente: <strong>{money(cartera?.granTotalPendiente ?? 0)}</strong>
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th style={{ textAlign: "right" }}>Facturas</th>
                <th style={{ textAlign: "right" }}>Saldo pendiente</th>
              </tr>
            </thead>
            <tbody>
              {carteraClientes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty">Sin cartera pendiente.</td>
                </tr>
              ) : (
                carteraClientes.map((c) => (
                  <tr key={c.idCliente}>
                    <td>{c.nombreCliente}</td>
                    <td style={{ textAlign: "right" }}>{c.facturas}</td>
                    <td style={{ textAlign: "right" }}>{money(c.totalPendiente)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
