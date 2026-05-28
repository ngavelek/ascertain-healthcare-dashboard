import type { PropsWithChildren } from "react";
import { LayoutDashboard, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <div>
            <p className="app-kicker">Ascertain</p>
            <strong>Healthcare Dashboard</strong>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <nav className="side-nav" aria-label="Primary navigation">
            <NavLink to="/" end>
              <LayoutDashboard size={18} aria-hidden="true" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/patients">
              <Users size={18} aria-hidden="true" />
              <span>Patients</span>
            </NavLink>
          </nav>
        </aside>

        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

