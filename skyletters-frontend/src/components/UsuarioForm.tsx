import { useEffect, useState, type FormEvent } from "react";
import Modal from "./Modal";
import { api } from "../api/client";

interface Props {
  initial?: Record<string, any> | null;
  onCancel: () => void;
  onSubmit: (values: Record<string, any>) => Promise<void>;
}

const TIPOS = [
  { value: "admin", label: "Administrador" },
  { value: "cont", label: "Contable" },
  { value: "aux", label: "Auxiliar" },
];

/**
 * Formulario de alta/edicion de usuario. En alta pide contrasena y tipo;
 * en edicion el tipo es fijo y la contrasena es opcional (en blanco = no cambia).
 */
export default function UsuarioForm({ initial, onCancel, onSubmit }: Props) {
  const isEdit = Boolean(initial?.id);
  const [nombreUsuario, setNombre] = useState(initial?.nombreUsuario ?? "");
  const [correoUsuario, setCorreo] = useState(initial?.correoUsuario ?? "");
  const [contrasenaUsuario, setContrasena] = useState("");
  const [rolUsuario, setRol] = useState(initial?.rolUsuario ?? "");
  const [tipoUsuario, setTipo] = useState(initial?.tipoUsuario ?? "aux");
  const [estadoUsuario, setEstado] = useState<boolean>(initial?.estadoUsuario ?? true);
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<any[]>("/roles")
      .then((d) => {
        const nombres = Array.isArray(d) ? d.map((r) => r.nombre).filter(Boolean) : [];
        setRoles(nombres);
        if (!initial?.rolUsuario && nombres.length) setRol(nombres[0]);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombreUsuario || !correoUsuario || !rolUsuario) {
      setError("Nombre, correo y rol son obligatorios");
      return;
    }
    if (!isEdit && contrasenaUsuario.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (contrasenaUsuario && contrasenaUsuario.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    const values: Record<string, any> = { nombreUsuario, correoUsuario, rolUsuario, estadoUsuario };
    if (!isEdit) {
      values.tipoUsuario = tipoUsuario;
      values.contrasenaUsuario = contrasenaUsuario;
    } else if (contrasenaUsuario) {
      values.contrasenaUsuario = contrasenaUsuario; // solo si se quiere cambiar
    }

    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo guardar el usuario");
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar usuario" : "Nuevo usuario"} onClose={onCancel}>
      {error && (
        <p className="error-msg">
          <i className="fa-solid fa-circle-exclamation" /> {error}
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
        <div className="grid2">
          <div className="field">
            <label>Nombre</label>
            <input value={nombreUsuario} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="field">
            <label>Correo</label>
            <input type="email" value={correoUsuario} onChange={(e) => setCorreo(e.target.value)} required />
          </div>
          <div className="field">
            <label>Rol</label>
            <select value={rolUsuario} onChange={(e) => setRol(e.target.value)} required>
              {roles.length === 0 && <option value="">(sin roles)</option>}
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={tipoUsuario} onChange={(e) => setTipo(e.target.value)} disabled={isEdit}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{isEdit ? "Nueva contraseña (opcional)" : "Contraseña"}</label>
            <input
              type="password"
              value={contrasenaUsuario}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder={isEdit ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"}
              required={!isEdit}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label>Estado</label>
            <select value={estadoUsuario ? "1" : "0"} onChange={(e) => setEstado(e.target.value === "1")}>
              <option value="1">Activo</option>
              <option value="0">Bloqueado</option>
            </select>
          </div>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
