import { useParams } from "react-router-dom";

type PatientFormPageProps = {
  mode: "create" | "edit";
};

export function PatientFormPage({ mode }: PatientFormPageProps) {
  const { id } = useParams();
  const title = mode === "create" ? "New patient" : "Edit patient";

  return (
    <section className="route-panel">
      <p className="eyebrow">Patient record</p>
      <h1>{title}</h1>
      {id ? <p className="route-copy">{id}</p> : null}
    </section>
  );
}

