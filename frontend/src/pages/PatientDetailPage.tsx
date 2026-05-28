import { Link, useParams } from "react-router-dom";

export function PatientDetailPage() {
  const { id } = useParams();

  return (
    <section className="route-panel">
      <p className="eyebrow">Patient record</p>
      <h1>Patient details</h1>
      <p className="route-copy">{id}</p>
      <Link className="text-link" to={`/patients/${id}/edit`}>
        Edit patient
      </Link>
    </section>
  );
}

