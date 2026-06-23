export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "brand" | "emerald" | "amber" | "red" | "steel";
}) {
  const accentColor =
    {
      brand: "text-brand-600 dark:text-brand-400",
      emerald: "text-emerald-600 dark:text-emerald-400",
      amber: "text-amber-600 dark:text-amber-400",
      red: "text-red-600 dark:text-red-400",
      steel: "text-steel-900 dark:text-steel-100",
    }[accent ?? "steel"] ?? "text-steel-900 dark:text-steel-100";

  return (
    <div className="card p-5">
      <div className="text-sm font-medium text-steel-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${accentColor}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-steel-400">{hint}</div>}
    </div>
  );
}
