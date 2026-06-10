import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CLASSIFICATION_LABELS, STATUTORY } from "@/lib/constants";
import { currency, hours, dateShort } from "@/lib/format";

export default async function PayPage() {
  const user = (await getCurrentUser())!;

  const approved = await prisma.timeEntry.findMany({
    where: { userId: user.id, status: "APPROVED" },
    orderBy: { clockIn: "desc" },
  });

  const rate = user.hourlyRate;
  const isContractor = user.classification === "CONTRACTOR";

  // Group approved entries into weekly pay periods (Mon–Sun).
  const stubs = new Map<string, { weekStart: Date; hours: number }>();
  for (const e of approved) {
    const d = new Date(e.clockIn);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString();
    const cur = stubs.get(key) ?? { weekStart: monday, hours: 0 };
    cur.hours += e.hours;
    stubs.set(key, cur);
  }

  const payStubs = Array.from(stubs.values())
    .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
    .map((s) => {
      const gross = s.hours * rate;
      let deductions = 0;
      if (isContractor) {
        // Sec 194C TDS for contractors.
        deductions = gross * STATUTORY.CONTRACTOR_TDS_RATE;
      } else {
        const pf = gross * STATUTORY.EMPLOYEE_PF_RATE;
        const monthlyEquivalent = gross * 4.33;
        const esi =
          monthlyEquivalent < STATUTORY.ESI_MONTHLY_WAGE_CEILING
            ? gross * STATUTORY.EMPLOYEE_ESI_RATE
            : 0;
        const pt = STATUTORY.PROFESSIONAL_TAX_MONTHLY / 4.33; // weekly portion
        deductions = pf + esi + pt;
      }
      return {
        weekStart: s.weekStart,
        hours: s.hours,
        gross,
        deductions,
        net: gross - deductions,
      };
    });

  const ytdGross = payStubs.reduce((s, p) => s + p.gross, 0);
  const yearEndDoc = isContractor ? "Form 16A (TDS)" : "Form 16";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Pay &amp; Documents</h1>
        <p className="mt-1 text-sm text-steel-500">
          Your pay slips and year-end tax documents. ({CLASSIFICATION_LABELS[user.classification]})
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm font-medium text-steel-500">YTD gross</div>
          <div className="mt-2 text-2xl font-bold text-steel-900">{currency(ytdGross)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-steel-500">Pay rate</div>
          <div className="mt-2 text-2xl font-bold text-steel-900">{currency(rate)}<span className="text-base text-steel-400">/hr</span></div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-steel-500">{yearEndDoc} (year-end)</div>
          <button className="btn-secondary mt-2 w-full" disabled>
            Available 15 Jun
          </button>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-steel-200 px-5 py-4">
          <h2 className="font-semibold text-steel-900">Pay slips</h2>
        </div>
        {payStubs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-steel-500">
            No approved pay periods yet. Slips appear once your hours are approved.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Pay period (week of)</th>
                  <th className="px-5 py-3 font-medium">Hours</th>
                  <th className="px-5 py-3 font-medium">Gross</th>
                  <th className="px-5 py-3 font-medium">{isContractor ? "TDS" : "PF / ESI / PT"}</th>
                  <th className="px-5 py-3 font-medium">Net</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {payStubs.map((p, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3 font-medium text-steel-900">{dateShort(p.weekStart)}</td>
                    <td className="px-5 py-3 text-steel-600">{hours(p.hours)}</td>
                    <td className="px-5 py-3 text-steel-600">{currency(p.gross)}</td>
                    <td className="px-5 py-3 text-steel-600">{currency(p.deductions)}</td>
                    <td className="px-5 py-3 font-semibold text-steel-900">{currency(p.net)}</td>
                    <td className="px-5 py-3 text-right">
                      <button className="text-xs font-medium text-brand-600 hover:text-brand-700" disabled>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
