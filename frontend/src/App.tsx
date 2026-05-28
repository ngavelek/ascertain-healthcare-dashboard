import { NavLink, Route, Routes } from "react-router-dom";

import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { PatientFormPage } from "./pages/PatientFormPage";
import { PatientsPage } from "./pages/PatientsPage";

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-kicker">Ascertain</p>
          <strong>Healthcare Dashboard</strong>
        </div>
        <nav className="top-nav" aria-label="Primary navigation">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/patients">Patients</NavLink>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/new" element={<PatientFormPage mode="create" />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route
            path="/patients/:id/edit"
            element={<PatientFormPage mode="edit" />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

