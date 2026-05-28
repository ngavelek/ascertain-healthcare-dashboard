import type { PatientStatus } from "../api/types";
import { formatStatus } from "../utils/format";

type StatusBadgeProps = {
  status: PatientStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${status}`}>{formatStatus(status)}</span>;
}

