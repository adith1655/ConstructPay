const STYLES: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  FLAGGED: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  DENIED: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
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
    <span className={`badge ${STYLES[status] ?? "bg-steel-100 text-steel-700 dark:bg-steel-800 dark:text-steel-300"}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
