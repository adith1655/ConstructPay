"use client";

import { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { hours, dateShort, timeShort } from "@/lib/format";

type CostCode = { id: string; code: string; description: string };
type Site = { id: string; name: string; geofenceRadius: number; costCodes: CostCode[] };
type Entry = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  hours: number;
  status: string;
  note: string | null;
  flagReason: string | null;
  jobSite: { name: string };
  costCode: { code: string; description: string } | null;
};

export default function TimesheetPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState<Entry | null>(null);
  const [siteId, setSiteId] = useState("");
  const [costCodeId, setCostCodeId] = useState("");
  const [outsideGeofence, setOutsideGeofence] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [sitesRes, timeRes] = await Promise.all([
      fetch("/api/sites"),
      fetch("/api/time?scope=mine"),
    ]);
    const sitesData = await sitesRes.json();
    const timeData = await timeRes.json();
    setSites(sitesData.sites ?? []);
    setEntries(timeData.entries ?? []);
    setOpen(timeData.open ?? null);
    if (!siteId && sitesData.sites?.[0]) setSiteId(sitesData.sites[0].id);
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSite = sites.find((s) => s.id === siteId);

  async function clockIn() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/time/clock-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobSiteId: siteId, costCodeId: costCodeId || null, outsideGeofence }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not clock in.");
    } else {
      setCostCodeId("");
      setOutsideGeofence(false);
      await load();
    }
    setBusy(false);
  }

  async function clockOut() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/time/clock-out", { method: "POST" });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not clock out.");
    } else {
      await load();
    }
    setBusy(false);
  }

  async function dispute(id: string) {
    const reason = window.prompt("Describe the issue with this entry:");
    if (!reason) return;
    await fetch(`/api/time/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "FLAG", reason }),
    });
    await load();
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">My Timesheet</h1>
        <p className="mt-1 text-sm text-steel-500">Clock in and out, and review your logged hours.</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Clock card */}
      <div className="card p-6">
        {open ? (
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="font-semibold text-steel-900">On the clock</span>
              </div>
              <p className="mt-1 text-sm text-steel-500">
                {open.jobSite.name} · since {timeShort(open.clockIn)}
                {open.costCode ? ` · ${open.costCode.code}` : ""}
              </p>
            </div>
            <button onClick={clockOut} disabled={busy} className="btn-danger px-6">
              {busy ? "…" : "Clock Out"}
            </button>
          </div>
        ) : sites.length === 0 ? (
          <p className="text-sm text-steel-500">You are not assigned to any job site yet. Contact your foreman.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
            <div>
              <label className="label">Job Site</label>
              <select
                className="input"
                value={siteId}
                onChange={(e) => {
                  setSiteId(e.target.value);
                  setCostCodeId("");
                }}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cost Code</label>
              <select className="input" value={costCodeId} onChange={(e) => setCostCodeId(e.target.value)}>
                <option value="">— Select —</option>
                {selectedSite?.costCodes.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} · {c.description}</option>
                ))}
              </select>
            </div>
            <button onClick={clockIn} disabled={busy} className="btn-success">
              {busy ? "…" : "Clock In"}
            </button>
            <label className="sm:col-span-3 flex items-center gap-2 text-xs text-steel-500">
              <input type="checkbox" checked={outsideGeofence} onChange={(e) => setOutsideGeofence(e.target.checked)} />
              I am outside the site geofence (will be flagged for foreman review)
            </label>
          </div>
        )}
      </div>

      {/* History */}
      <div className="card">
        <div className="border-b border-steel-200 px-5 py-4">
          <h2 className="font-semibold text-steel-900">Recent entries</h2>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-steel-500">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="px-5 py-3 font-medium">Cost Code</th>
                  <th className="px-5 py-3 font-medium">In / Out</th>
                  <th className="px-5 py-3 font-medium">Hours</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-3 font-medium text-steel-900">{dateShort(e.clockIn)}</td>
                    <td className="px-5 py-3 text-steel-600">{e.jobSite.name}</td>
                    <td className="px-5 py-3 text-steel-600">{e.costCode?.code ?? "—"}</td>
                    <td className="px-5 py-3 text-steel-600">{timeShort(e.clockIn)} – {timeShort(e.clockOut)}</td>
                    <td className="px-5 py-3 text-steel-600">{e.clockOut ? hours(e.hours) : "—"}</td>
                    <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-5 py-3 text-right">
                      {["PENDING", "APPROVED"].includes(e.status) && (
                        <button onClick={() => dispute(e.id)} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                          Dispute
                        </button>
                      )}
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

function Loading() {
  return <div className="text-sm text-steel-500">Loading…</div>;
}
