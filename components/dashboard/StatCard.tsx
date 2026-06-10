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
      brand: "text-brand-600",
      emerald: "text-emerald-600",
      amber: "text-amber-600",
      red: "text-red-600",
      steel: "text-steel-900",
    }[accent ?? "steel"] ?? "text-steel-900";

  return (
    <div className="card p-5">
      <div className="text-sm font-medium text-steel-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${accentColor}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-steel-400">{hint}</div>}
    </div>
  );
}
