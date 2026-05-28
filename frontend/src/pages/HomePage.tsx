import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">Clinical operations</p>
        <h1>Dashboard</h1>
        <p>Patient workflow status, recent activity, and review queues.</p>
      </div>
      <Link className="button button--secondary" to="/patients">
        View patients
      </Link>
    </section>
  );
}
