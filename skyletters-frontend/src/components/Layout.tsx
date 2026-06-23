import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useThemeMode } from "../theme/ThemeModeContext";
import { RESOURCES } from "../config/resources";

// Agrupación del menú por secciones contables.
const SECTIONS: { title: string; keys: string[] }[] = [
  { title: "Maestros", keys: ["clientes", "proveedores", "productos", "inventario"] },
  { title: "Documentos", keys: ["facturas", "compras", "notas", "asientos"] },
  { title: "Contable", keys: ["cuentas", "impuestos", "conciliacion", "reportes"] },
  { title: "Configuración", keys: ["parametrizacion", "resoluciones", "roles", "usuarios"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { mode, toggle } = useThemeMode();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <i className="fa-solid fa-book-open" /> Skyletters
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fa-solid fa-house" /> Inicio
          </NavLink>
          {SECTIONS.map((section) => {
            const items = section.keys
              .map((k) => RESOURCES.find((r) => r.key === k))
              .filter(Boolean) as typeof RESOURCES;
            if (items.length === 0) return null;
            return (
              <div key={section.title} className="nav-section">
                <span className="nav-section-title">{section.title}</span>
                {items.map((r) => (
                  <NavLink
                    key={r.key}
                    to={`/${r.key}`}
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    <i className={r.icon} /> {r.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="spacer" />
        <button className="theme-toggle" title="Cambiar tema" onClick={toggle}>
          <i className={`fa-solid ${mode === "dark" ? "fa-sun" : "fa-moon"}`} />
          {mode === "dark" ? "Tema claro" : "Tema oscuro"}
        </button>
        <div className="user-box">
          <div className="user-row">
            <span className="user-avatar">
              {(user?.nombreUsuario?.[0] ?? "U").toUpperCase()}
            </span>
            <div className="user-meta">
              <div className="user-name">{user?.nombreUsuario}</div>
              <div className="user-mail">{user?.correoUsuario}</div>
            </div>
          </div>
          <button className="link" title="Cerrar sesiÃ³n" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
