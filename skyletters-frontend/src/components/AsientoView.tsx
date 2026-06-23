import Modal from "./Modal";

interface Movimiento {
  codigoCuenta: string;
  nombreCuenta: string;
  debito: number;
  credito: number;
}

const money = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    Number(n) || 0,
  );

const formatDate = (v: any) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO");
};

/**
 * Visor de un asiento contable: cabecera + lineas de partida doble con
 * sus columnas de debito/credito y el cuadre (debitos == creditos).
 */
export default function AsientoView({ asiento, onClose }: { asiento: any; onClose: () => void }) {
  const movimientos: Movimiento[] = Array.isArray(asiento?.movimientos) ? asiento.movimientos : [];
  const totalDebito = movimientos.reduce((a, m) => a + Number(m.debito || 0), 0);
  const totalCredito = movimientos.reduce((a, m) => a + Number(m.credito || 0), 0);
  const cuadra = Math.abs(totalDebito - totalCredito) < 0.01;

  return (
    <Modal title={`Asiento #${asiento.id} · ${asiento.tipoOrigen}`} onClose={onClose} wide>
      <div className="asiento-view">
        <div className="asiento-meta">
          <div>
            <span className="muted">Descripción</span>
            <strong>{asiento.descripcion}</strong>
          </div>
          <div>
            <span className="muted">Fecha</span>
            <strong>{formatDate(asiento.fechaCreacionRegistro)}</strong>
          </div>
          <div>
            <span className="muted">Documento</span>
            <strong>N° {asiento.numeroFactura}</strong>
          </div>
        </div>

        <table className="asiento-table">
          <thead>
            <tr>
              <th>Cuenta</th>
              <th>Nombre</th>
              <th className="num">Débito</th>
              <th className="num">Crédito</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted" style={{ textAlign: "center" }}>
                  Este asiento no tiene movimientos estructurados.
                </td>
              </tr>
            ) : (
              movimientos.map((m, i) => (
                <tr key={i}>
                  <td className="mono">{m.codigoCuenta}</td>
                  <td>{m.nombreCuenta}</td>
                  <td className="num">{m.debito > 0 ? money(m.debito) : ""}</td>
                  <td className="num">{m.credito > 0 ? money(m.credito) : ""}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>
                <strong>Totales</strong>
              </td>
              <td className="num">
                <strong>{money(totalDebito)}</strong>
              </td>
              <td className="num">
                <strong>{money(totalCredito)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        <div className={`asiento-balance ${cuadra ? "ok" : "off"}`}>
          <i className={`fa-solid ${cuadra ? "fa-circle-check" : "fa-triangle-exclamation"}`} />
          {cuadra ? "Partida doble cuadrada (débitos = créditos)" : "Asiento descuadrado"}
        </div>
      </div>
    </Modal>
  );
}
