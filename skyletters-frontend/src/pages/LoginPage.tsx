import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const FEATURES = [
  { icon: "fa-file-invoice-dollar", text: "Facturación con impuestos automáticos" },
  { icon: "fa-users", text: "Clientes, proveedores y productos" },
  { icon: "fa-scale-balanced", text: "Conciliación y reportes financieros" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState("admin@skyletters.com");
  const [contrasena, setContrasena] = useState("Admin123!");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(correo, contrasena);
      navigate("/");
    } catch (err: any) {
      setError(err?.message ?? "No se pudo iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <div className="login-split">
      <div className="login-hero">
        <div className="login-hero-brand">
          <i className="fa-solid fa-book-open" /> Skyletters
        </div>
        <h2 className="login-hero-title">Tu contabilidad, clara y al día.</h2>
        <p className="login-hero-sub">
          Sistema contable: facturación, impuestos, conciliación y reportes en un solo lugar.
        </p>
        <ul className="login-features">
          {FEATURES.map((f) => (
            <li key={f.icon}>
              <i className={`fa-solid ${f.icon}`} />
              {f.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="login-form-side">
        <div className="login-card">
          <h1>Iniciar sesión</h1>
          <p className="sub">Ingresa tus credenciales para continuar</p>
          {error && (
            <p className="error-msg">
              <i className="fa-solid fa-circle-exclamation" /> {error}
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Correo</label>
              <div className="input-icon">
                <i className="fa-solid fa-envelope" />
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="field">
              <label>Contraseña</label>
              <div className="input-icon">
                <i className="fa-solid fa-lock" />
                <input
                  type={showPass ? "text" : "password"}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? "Ocultar" : "Mostrar"}
                >
                  <i className={`fa-solid ${showPass ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
            </div>
            <button type="submit" title="Ingresar" disabled={loading} className="login-submit">
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" /> Ingresando…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket" /> Ingresar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
