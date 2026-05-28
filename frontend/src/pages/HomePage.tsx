import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <section className="route-panel">
      <p className="eyebrow">Clinical operations</p>
      <h1>Dashboard</h1>
      <p className="route-copy">
        Patient workflow status, recent activity, and review queues will live here.
      </p>
      <Link className="text-link" to="/patients">
        View patients
      </Link>
    </section>
  );
}

