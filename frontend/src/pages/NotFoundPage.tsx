import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="route-panel">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <Link className="text-link" to="/patients">
        View patients
      </Link>
    </section>
  );
}

