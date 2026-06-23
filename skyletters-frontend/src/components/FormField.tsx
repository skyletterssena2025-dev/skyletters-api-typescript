import type { FieldConfig } from "../config/resources";

export interface RefOption {
  value: string;
  label: string;
}

interface Props {
  field: FieldConfig;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
  /** Opciones cargadas para campos de tipo "reference". */
  refOptions?: RefOption[];
  /** Mensaje de error de validación del backend para este campo. */
  error?: string;
}

export default function FormField({ field, value, onChange, refOptions = [], error }: Props) {
  const label = (
    <label>
      {field.label}
      {field.optional ? " (opcional)" : ""}
    </label>
  );

  if (field.type === "boolean") {
    return (
      <div className="field field-switch">
        <label className="switch">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="switch-track">
            <span className="switch-thumb" />
          </span>
          <span className="switch-label">{field.label}</span>
        </label>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="field">
        {label}
        <select value={String(value)} onChange={(e) => onChange(e.target.value)} required={!field.optional}>
          <option value="">— Seleccionar —</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "multireference") {
    const selected = String(value)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    function toggle(optValue: string) {
      const next = selected.includes(optValue)
        ? selected.filter((v) => v !== optValue)
        : [...selected, optValue];
      onChange(next.join(","));
    }
    return (
      <div className="field field-multi">
        {label}
        <div className="chip-group">
          {refOptions.length === 0 && <span className="multi-empty">Sin opciones</span>}
          {refOptions.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                type="button"
                key={o.value}
                className={`chip${on ? " chip--on" : ""}`}
                onClick={() => toggle(o.value)}
              >
                {on && <i className="fa-solid fa-check" />}
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "reference") {
    return (
      <div className="field">
        {label}
        <select value={String(value)} onChange={(e) => onChange(e.target.value)} required={!field.optional}>
          <option value="">— Seleccionar —</option>
          {refOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const isEmail = /correo|email/i.test(field.name);
  const inputType =
    field.type === "date" ? "date" : field.type === "number" ? "number" : isEmail ? "email" : "text";

  return (
    <div className="field">
      {label}
      <input
        type={inputType}
        className={error ? "invalid" : undefined}
        aria-invalid={error ? true : undefined}
        step={field.type === "number" ? "any" : undefined}
        min={field.type === "number" ? 0 : undefined}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        required={!field.optional}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
