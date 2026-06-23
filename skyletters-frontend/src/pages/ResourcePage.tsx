import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { findResource, type FieldConfig } from "../config/resources";
import DataTable, { type Column } from "../components/DataTable";
import ResourceForm from "../components/ResourceForm";
import FacturaForm from "../components/FacturaForm";
import CompraForm from "../components/CompraForm";
import NotaForm from "../components/NotaForm";
import InvoicePreview from "../components/InvoicePreview";
import NotaPreview from "../components/NotaPreview";
import PagoModal from "../components/PagoModal";
import EstadoCuentaModal from "../components/EstadoCuentaModal";
import AsientoView from "../components/AsientoView";
import ConciliacionDetalle from "../components/ConciliacionDetalle";
import ReportsView from "../components/ReportsView";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { useAuth } from "../auth/AuthContext";
import type { RefOption } from "../components/FormField";

const MONEY_FIELDS = /saldo|subtotal|total|precio|impuesto|base/i;

function isMoney(field: FieldConfig): boolean {
  return field.type === "number" && MONEY_FIELDS.test(field.name);
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 }).format(n);
}

function formatDate(value: any): string {
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value ?? "—") : d.toLocaleDateString("es-CO");
}

export default function ResourcePage() {
  const { key } = useParams<{ key: string }>();
  const resource = findResource(key);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, any> | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [previewing, setPreviewing] = useState<any | null>(null);
  const [abonando, setAbonando] = useState<any | null>(null);
  const [estadoCuenta, setEstadoCuenta] = useState<any | null>(null);
  const [viendoAsiento, setViendoAsiento] = useState<any | null>(null);
  const [conciliando, setConciliando] = useState<any | null>(null);
  const { user } = useAuth();
  const toast = useToast();
  const [refOptions, setRefOptions] = useState<Record<string, RefOption[]>>({});
  const [refLabels, setRefLabels] = useState<Record<string, Map<string, string>>>({});

  const load = useCallback(async () => {
    if (!resource) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<any[]>(`/${resource.key}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message ?? "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [resource]);

  // Carga las opciones de los campos "reference" (dropdowns relacionales).
  const loadReferences = useCallback(async () => {
    if (!resource) return;
    const refFields = resource.fields.filter(
      (f) => (f.type === "reference" || f.type === "multireference") && f.ref,
    );
    if (refFields.length === 0) return;
    const opts: Record<string, RefOption[]> = {};
    const labels: Record<string, Map<string, string>> = {};
    await Promise.all(
      refFields.map(async (f) => {
        try {
          const data = await api<any[]>(f.ref!.endpoint);
          const list = Array.isArray(data) ? data : [];
          opts[f.name] = list.map((item) => ({
            value: String(item[f.ref!.valueKey]),
            label: f.ref!.labelKey(item),
          }));
          labels[f.name] = new Map(opts[f.name].map((o) => [o.value, o.label]));
        } catch {
          opts[f.name] = [];
        }
      }),
    );
    setRefOptions(opts);
    setRefLabels(labels);
  }, [resource]);

  useEffect(() => {
    setRefOptions({});
    setRefLabels({});
    load();
    loadReferences();
  }, [load, loadReferences]);

  if (!resource) return <p>Módulo no encontrado.</p>;
  if (resource.key === "reportes") return <ReportsView />;

  async function handleSubmit(values: Record<string, any>) {
    const isEdit = Boolean(editing);
    if (editing) {
      await api(`/${resource!.key}/${editing.id}`, { method: "PUT", body: JSON.stringify(values) });
    } else {
      await api(`/${resource!.key}`, { method: "POST", body: JSON.stringify(values) });
    }
    setEditing(undefined);
    toast.success(`${resource!.singular} ${isEdit ? "actualizado" : "creado"} correctamente`);
    await load();
  }

  // Bloquea / desbloquea un usuario alternando estadoUsuario.
  async function toggleEstadoUsuario(row: any) {
    const activar = !row.estadoUsuario;
    // Evita que el usuario se bloquee a sí mismo (quedaría sin acceso).
    if (!activar && user?.correoUsuario && row.correoUsuario === user.correoUsuario) {
      toast.error("No puedes bloquear tu propia cuenta");
      return;
    }
    try {
      await api(`/${resource!.key}/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ estadoUsuario: activar }),
      });
      toast.success(activar ? "Usuario desbloqueado" : "Usuario bloqueado");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo actualizar el usuario");
    }
  }

  async function confirmDelete() {
    const row = deleting;
    setDeleting(null);
    try {
      await api(`/${resource!.key}/${row.id}`, { method: "DELETE" });
      toast.success("Registro eliminado");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo eliminar");
    }
  }

  // Construye las columnas de la DataTable a partir de los campos del recurso.
  const columns: Column[] = [
    { key: "id", header: "ID", value: (r) => r.id },
    ...resource.fields
      .filter((f) => !f.hideInTable)
      .map<Column>((f) => ({
        key: f.name,
        header: f.label,
        align: f.type === "number" ? "right" : undefined,
        value: (row) => {
          if (f.type === "reference") return refLabels[f.name]?.get(String(row[f.name])) ?? row[f.name];
          const v = row[f.name];
          return v == null ? "" : v;
        },
        render: (row) => {
          const v = row[f.name];
          if (f.type === "boolean") {
            return (
              <span className={`badge ${v ? "ok" : "off"}`}>
                <span className="badge-dot" /> {v ? "Activo" : "Inactivo"}
              </span>
            );
          }
          if (f.type === "reference") {
            return refLabels[f.name]?.get(String(v)) ?? String(v ?? "—");
          }
          if (f.type === "date") return formatDate(v);
          if (isMoney(f) && v != null) return <span className="num">{formatMoney(Number(v))}</span>;
          if (f.type === "number" && v != null) return <span className="num">{v}</span>;
          return v == null || v === "" ? "—" : String(v);
        },
      })),
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <h2>
            <i className={resource.icon} /> {resource.label}
          </h2>
          {!loading && (
            <span className="page-sub">
              {rows.length} {rows.length === 1 ? "registro" : "registros"}
            </span>
          )}
        </div>
        {!resource.readOnly && !resource.noCreate && (
          <button title={`Nuevo ${resource.singular}`} onClick={() => setEditing(null)}>
            <i className="fa-solid fa-plus" /> Nuevo {resource.singular.toLowerCase()}
          </button>
        )}
      </header>

      {error && (
        <p className="error-msg">
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="Sin registros todavía."
        actions={
          resource.readOnly
            ? resource.key === "asientos"
              ? (row) => (
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      title="Ver asiento"
                      aria-label="Ver asiento"
                      onClick={() => setViendoAsiento(row)}
                    >
                      <i className="fa-solid fa-eye" />
                    </button>
                  </div>
                )
              : undefined
            : (row) => (
                <div className="row-actions">
                  {(resource.key === "facturas" || resource.key === "notas") && (
                    <button
                      className="icon-btn"
                      title="Ver / PDF"
                      aria-label="Ver / PDF"
                      onClick={() => setPreviewing(row)}
                    >
                      <i className="fa-solid fa-eye" />
                    </button>
                  )}
                  {resource.key === "facturas" && (
                    <button
                      className="icon-btn"
                      title="Registrar abono"
                      aria-label="Registrar abono"
                      onClick={() => setAbonando(row)}
                    >
                      <i className="fa-solid fa-hand-holding-dollar" />
                    </button>
                  )}
                  {resource.key === "clientes" && (
                    <button
                      className="icon-btn"
                      title="Estado de cuenta"
                      aria-label="Estado de cuenta"
                      onClick={() => setEstadoCuenta(row)}
                    >
                      <i className="fa-solid fa-file-invoice" />
                    </button>
                  )}
                  {resource.key === "conciliacion" && (
                    <button
                      className="icon-btn"
                      title="Conciliar"
                      aria-label="Conciliar"
                      onClick={() => setConciliando(row)}
                    >
                      <i className="fa-solid fa-scale-balanced" />
                    </button>
                  )}
                  {resource.key === "usuarios" && (
                    <button
                      className={`icon-btn ${row.estadoUsuario ? "danger" : ""}`}
                      title={row.estadoUsuario ? "Bloquear" : "Desbloquear"}
                      aria-label={row.estadoUsuario ? "Bloquear" : "Desbloquear"}
                      onClick={() => toggleEstadoUsuario(row)}
                    >
                      <i className={`fa-solid ${row.estadoUsuario ? "fa-lock" : "fa-lock-open"}`} />
                    </button>
                  )}
                  <button
                    className="icon-btn"
                    title="Editar"
                    aria-label="Editar"
                    onClick={() => setEditing(row)}
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Eliminar"
                    aria-label="Eliminar"
                    onClick={() => setDeleting(row)}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              )
        }
      />

      {editing !== undefined &&
        (resource.key === "facturas" ? (
          <FacturaForm
            initial={editing}
            onCancel={() => setEditing(undefined)}
            onSubmit={handleSubmit}
          />
        ) : resource.key === "notas" ? (
          <NotaForm
            initial={editing}
            onCancel={() => setEditing(undefined)}
            onSubmit={handleSubmit}
          />
        ) : resource.key === "compras" ? (
          <CompraForm
            initial={editing}
            onCancel={() => setEditing(undefined)}
            onSubmit={handleSubmit}
          />
        ) : (
          <ResourceForm
            resource={resource}
            initial={editing}
            refOptionsByField={refOptions}
            onCancel={() => setEditing(undefined)}
            onSubmit={handleSubmit}
          />
        ))}

      {previewing &&
        (resource.key === "notas" ? (
          <NotaPreview nota={previewing} onClose={() => setPreviewing(null)} />
        ) : (
          <InvoicePreview factura={previewing} onClose={() => setPreviewing(null)} />
        ))}

      {abonando && (
        <PagoModal
          factura={abonando}
          onCancel={() => setAbonando(null)}
          onDone={() => {
            setAbonando(null);
            toast.success("Abono registrado");
            load();
          }}
        />
      )}

      {estadoCuenta && (
        <EstadoCuentaModal cliente={estadoCuenta} onClose={() => setEstadoCuenta(null)} />
      )}

      {viendoAsiento && (
        <AsientoView asiento={viendoAsiento} onClose={() => setViendoAsiento(null)} />
      )}

      {conciliando && (
        <ConciliacionDetalle conciliacion={conciliando} onClose={() => setConciliando(null)} />
      )}

      {deleting && (
        <ConfirmDialog
          message={`¿Eliminar este registro de ${resource.singular.toLowerCase()} (ID ${deleting.id})? Esta acción no se puede deshacer.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
