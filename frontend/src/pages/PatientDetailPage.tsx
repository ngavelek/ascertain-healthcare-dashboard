import { Link, useParams } from "react-router-dom";

export function PatientDetailPage() {
  const { id } = useParams();

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">Patient record</p>
        <h1>Patient details</h1>
        <p>{id}</p>
      </div>
      <Link className="button button--secondary" to={`/patients/${id}/edit`}>
        Edit patient
      </Link>
    </section>
  );
}
