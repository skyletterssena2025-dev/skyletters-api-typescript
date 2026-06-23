import { useState, type FormEvent } from "react";
import type { ResourceConfig } from "../config/resources";
import Modal from "./Modal";
import FormField, { type RefOption } from "./FormField";
import type { FieldConfig } from "../config/resources";

// Agrupa los campos por sección, preservando el orden de aparición.
function groupBySection(allFields: FieldConfig[]): [string, FieldConfig[]][] {
  const fields = allFields.filter((f) => !f.hideInForm);
  const order: string[] = [];
  const map = new Map<string, FieldConfig[]>();
  for (const f of fields) {
    const key = f.section ?? "";
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(f);
  }
  return order.map((k) => [k, map.get(k)!]);
}

interface Props {
  resource: ResourceConfig;
  initial?: Record<string, any> | null;
  refOptionsByField: Record<string, RefOption[]>;
  onCancel: () => void;
  onSubmit: (values: Record<string, any>) => Promise<void>;
}

// Convierte un valor ISO de la API a formato yyyy-mm-dd para <input type=date>.
function toDateInput(value: any): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function ResourceForm({
  resource,
  initial,
  refOptionsByField,
  onCancel,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const v: Record<string, string | boolean> = {};
    for (const f of resource.fields) {
      const raw = initial?.[f.name];
      if (f.type === "boolean") v[f.name] = raw == null ? true : Boolean(raw);
      else if (f.type === "date") v[f.name] = toDateInput(raw);
      else v[f.name] = raw != null ? String(raw) : "";
    }
    return v;
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function update(name: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const f of resource.fields) {
        if (f.hideInForm) continue;
        const raw = values[f.name];
        if (f.type === "boolean") {
          payload[f.name] = Boolean(raw);
          continue;
        }
        if (raw === "" || raw == null) {
          if (f.optional) continue;
        }
        if (f.type === "number" || f.type === "reference") {
          payload[f.name] = Number(raw);
        } else if (f.type === "multireference") {
          payload[f.name] = String(raw ?? "");
        } else {
          payload[f.name] = raw;
        }
      }
      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.message ?? "Error al guardar");
      if (err?.fields) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fields)) {
          fe[k] = Array.isArray(v) ? (v[0] as string) : String(v);
        }
        setFieldErrors(fe);
      }
      setSaving(false);
    }
  }

  return (
    <Modal title={`${initial ? "Editar" : "Nuevo"} — ${resource.singular}`} onClose={onCancel}>
      {error && (
        <p className="error-msg">
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        {groupBySection(resource.fields).map(([section, fields]) => (
          <div className="form-section" key={section || "_"}>
            {section && <div className="form-section-title">{section}</div>}
            <div className="grid2">
              {fields.map((f) => (
                <FormField
                  key={f.name}
                  field={f}
                  value={values[f.name]}
                  refOptions={refOptionsByField[f.name]}
                  error={fieldErrors[f.name]}
                  onChange={(val) => update(f.name, val)}
                />
              ))}
            </div>
          </div>
        ))}
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
                <i className="fa-solid fa-floppy-disk" /> Guardar
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
