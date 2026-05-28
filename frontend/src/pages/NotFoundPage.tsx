import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
      </div>
      <Link className="button button--secondary" to="/patients">
        View patients
      </Link>
    </section>
  );
}
