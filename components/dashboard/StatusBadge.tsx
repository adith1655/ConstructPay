const STYLES: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  FLAGGED: "bg-orange-50 text-orange-700",
  REJECTED: "bg-red-50 text-red-700",
  DENIED: "bg-red-50 text-red-700",
};

const LABELS: Record<string, string> = {
  OPEN: "On the clock",
  PENDING: "Pending approval",
  APPROVED: "Approved",
  FLAGGED: "Flagged",
  REJECTED: "Rejected",
  DENIED: "Denied",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STYLES[status] ?? "bg-steel-100 text-steel-700"}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
