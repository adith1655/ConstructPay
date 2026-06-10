"use client";

import { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { hours, dateShort, timeShort } from "@/lib/format";
import { CLASSIFICATION_LABELS } from "@/lib/constants";

type Entry = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  hours: number;
  status: string;
  flagReason: string | null;
  user: { fullName: string; trade: string | null; classification: string };
  jobSite: { name: string };
  costCode: { code: string; description: string } | null;
};

export default function ApprovalsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/time?scope=approvals");
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "APPROVE" | "REJECT") {
    setBusyId(id);
    await fetch(`/api/time/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    setBusyId(null);
  }

  if (loading) return <div className="text-sm text-steel-500">Loading…</div>;

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Timesheet Approvals</h1>
        <p className="mt-1 text-sm text-steel-500">
          Review and approve crew hours before the payroll cutoff. Unapproved entries block the payroll run.
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-steel-200 px-5 py-4">
          <h2 className="font-semibold text-steel-900">Awaiting review</h2>
          <span className="text-sm text-steel-500">{entries.length} entries · {hours(totalHours)}</span>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-steel-500">
            All caught up — no timesheets awaiting approval.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Worker</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Site / Cost Code</th>
                  <th className="px-5 py-3 font-medium">In / Out</th>
                  <th className="px-5 py-3 font-medium">Hours</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-steel-900">{e.user.fullName}</div>
                      <div className="text-xs text-steel-500">
                        {e.user.trade} · {CLASSIFICATION_LABELS[e.user.classification]}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-steel-600">{dateShort(e.clockIn)}</td>
                    <td className="px-5 py-3 text-steel-600">
                      {e.jobSite.name}
                      <div className="text-xs text-steel-400">{e.costCode?.code ?? "No cost code"}</div>
                    </td>
                    <td className="px-5 py-3 text-steel-600">{timeShort(e.clockIn)} – {timeShort(e.clockOut)}</td>
                    <td className="px-5 py-3 font-medium text-steel-900">{hours(e.hours)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={e.status} />
                      {e.flagReason && <div className="mt-1 text-xs text-orange-600">{e.flagReason}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => act(e.id, "APPROVE")}
                          disabled={busyId === e.id}
                          className="btn-success px-3 py-1.5 text-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => act(e.id, "REJECT")}
                          disabled={busyId === e.id}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          Reject
                        </button>
                      </div>
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
