import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { RESOURCES } from "../config/resources";
import { useAuth } from "../auth/AuthContext";
import { ChartCard, BarChart, DonutChart, type Bar, type Segment } from "../components/charts/Charts";

const money = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    isNaN(Number(n)) ? 0 : Number(n),
  );

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ESTADO_COLOR: Record<string, string> = {
  PAGADA: "#4ade80",
  PARCIAL: "#fbbf24",
  PENDIENTE: "#60a5fa",
  ANULADA: "#f87171",
};

interface Kpi {
  ventas: number | null;
  cartera: number | null;
  facturas: number | null;
  clientes: number | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const year = new Date().getUTCFullYear();
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [kpi, setKpi] = useState<Kpi>({ ventas: null, cartera: null, facturas: null, clientes: null });
  const [ventasMes, setVentasMes] = useState<Bar[]>([]);
  const [estadoCartera, setEstadoCartera] = useState<Segment[]>([]);
  const [ventasVsCompras, setVentasVsCompras] = useState<Bar[]>([]);

  useEffect(() => {
    let active = true;

    // Conteos por modulo (para los accesos rapidos).
    Promise.all(
      RESOURCES.map(async (r) => {
        try {
          const data = await api<any[]>(`/${r.key}`);
          return [r.key, Array.isArray(data) ? data.length : 0] as const;
        } catch {
          return [r.key, null] as const;
        }
      }),
    ).then((entries) => {
      if (active) setCounts(Object.fromEntries(entries));
    });

    (async () => {
      // Datos base: facturas del anio y compras (para agregaciones de graficas).
      const [ventasRep, cartera, facturas, compras, clientes] = await Promise.all([
        api<any>(`/reportes/ventas?desde=${year}-01-01&fin=${year}-12-31`).catch(() => null),
        api<any>(`/reportes/cartera`).catch(() => null),
        api<any[]>(`/facturas`).catch(() => null),
        api<any[]>(`/compras`).catch(() => null),
        api<any[]>(`/clientes`).catch(() => null),
      ]);
      if (!active) return;

      const ventasTotal = ventasRep?.totales?.total ?? null;
      setKpi({
        ventas: ventasTotal,
        cartera: cartera?.granTotalPendiente ?? null,
        facturas: Array.isArray(facturas) ? facturas.length : null,
        clientes: Array.isArray(clientes) ? clientes.length : null,
      });

      // Ventas por mes (bar): agrupa las facturas del reporte por mes de fechaFactura.
      const porMes = new Array(12).fill(0);
      const listaFacturas: any[] = ventasRep?.facturas ?? (Array.isArray(facturas) ? facturas : []);
      for (const f of listaFacturas) {
        const fecha = new Date(f.fecha ?? f.fechaFactura);
        if (!isNaN(fecha.getTime()) && fecha.getUTCFullYear() === year) {
          porMes[fecha.getUTCMonth()] += Number(f.total ?? f.totalFactura ?? 0);
        }
      }
      setVentasMes(MESES.map((m, i) => ({ label: m, value: porMes[i] })));

      // Estado de cartera (donut): cuenta facturas por estado.
      if (Array.isArray(facturas)) {
        const porEstado = new Map<string, number>();
        for (const f of facturas) {
          const e = String(f.estado ?? "PENDIENTE");
          porEstado.set(e, (porEstado.get(e) ?? 0) + 1);
        }
        setEstadoCartera(
          Array.from(porEstado.entries()).map(([label, value]) => ({
            label,
            value,
            color: ESTADO_COLOR[label] ?? "#94a3b8",
          })),
        );
      }

      // Ventas vs Compras (bar): totales del periodo.
      const totalCompras = Array.isArray(compras)
        ? compras.reduce((a, c) => a + Number(c.total ?? 0), 0)
        : 0;
      setVentasVsCompras([
        { label: "Ventas", value: Number(ventasTotal ?? 0) },
        { label: "Compras", value: totalCompras },
      ]);
    })();

    return () => {
      active = false;
    };
  }, [year]);

  const heroes = [
    { label: `Ventas ${year}`, value: kpi.ventas, money: true, icon: "fa-coins", tone: "blue" },
    { label: "Cartera pendiente", value: kpi.cartera, money: true, icon: "fa-hand-holding-dollar", tone: "amber" },
    { label: "Facturas emitidas", value: kpi.facturas, money: false, icon: "fa-file-invoice-dollar", tone: "green" },
    { label: "Clientes activos", value: kpi.clientes, money: false, icon: "fa-users", tone: "cyan" },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h2>
            <i className="fa-solid fa-gauge-high" /> Hola, {user?.nombreUsuario}
          </h2>
          <span className="page-sub">Resumen general del negocio</span>
        </div>
      </header>

      <div className="kpi-row">
        {heroes.map((h) => (
          <div className={`kpi-card kpi-${h.tone}`} key={h.label}>
            <div className="kpi-icon">
              <i className={`fa-solid ${h.icon}`} />
            </div>
            <div className="kpi-body">
              <div className="kpi-label">{h.label}</div>
              <div className="kpi-value">
                {h.value === null ? "—" : h.money ? money(h.value) : h.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <ChartCard title={`Ventas por mes ${year}`} icon="fa-chart-column" sub="Total facturado">
          <BarChart data={ventasMes} />
        </ChartCard>
        <ChartCard title="Estado de cartera" icon="fa-chart-pie" sub="Facturas por estado">
          <DonutChart segments={estadoCartera} />
        </ChartCard>
        <ChartCard title="Ventas vs Compras" icon="fa-scale-balanced" sub={`Acumulado ${year}`}>
          <BarChart data={ventasVsCompras} />
        </ChartCard>
      </div>

      <h3 className="section-heading">Accesos rápidos</h3>
      <div className="cards">
        {RESOURCES.map((r) => (
          <Link to={`/${r.key}`} key={r.key}>
            <div className="card card-compact">
              <span className="card-icon">
                <i className={r.icon} />
              </span>
              <div>
                <h3>{r.label}</h3>
                <div className="muted">
                  {counts[r.key] === null ? "—" : `${counts[r.key] ?? "…"} registros`}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
