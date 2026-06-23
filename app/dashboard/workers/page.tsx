"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLES, CLASSIFICATION_LABELS } from "@/lib/constants";
import { currency } from "@/lib/format";

type User = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  classification: string;
  trade: string | null;
  hourlyRate: number;
  complianceDocsOnFile: boolean;
  active: boolean;
  siteAssignments: { jobSite: { name: string } }[];
};

export default function WorkersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/users?role=WORKER");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, role: ROLES.WORKER }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not create worker.");
      return;
    }
    setShowCreate(false);
    e.currentTarget.reset();
    await load();
  }

  if (loading) return <div className="text-sm text-steel-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-steel-900">Crew / Workers</h1>
          <p className="mt-1 text-sm text-steel-500">
            Add worker login accounts for your assigned job sites. New workers are auto-assigned to your sites.
          </p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className="btn-primary">
          {showCreate ? "Close" : "+ Add Worker"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="card grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          {error && <div className="sm:col-span-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div><label className="label">Full name</label><input name="fullName" required className="input" /></div>
          <div><label className="label">Email (login)</label><input name="email" type="email" required className="input" /></div>
          <div><label className="label">Trade</label><input name="trade" className="input" placeholder="e.g. Electrician" /></div>
          <div>
            <label className="label">Classification</label>
            <select name="classification" className="input" defaultValue="PAYROLL">
              <option value="PAYROLL">On-Roll (PF / ESI)</option>
              <option value="CONTRACTOR">Contract Labour (TDS)</option>
            </select>
          </div>
          <div><label className="label">Hourly rate (₹)</label><input name="hourlyRate" type="number" min="0" defaultValue="0" className="input" /></div>
          <div><label className="label">Temporary password</label><input name="password" minLength={8} className="input" placeholder="optional if Google enabled" /></div>
          <div className="sm:col-span-3 flex justify-end">
            <button type="submit" className="btn-primary">Create worker login</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Rate</th>
              <th className="px-5 py-3 font-medium">Sites</th>
              <th className="px-5 py-3 font-medium">Compliance</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3">
                  <div className="font-medium text-steel-900">{u.fullName}</div>
                  <div className="text-xs text-steel-500">{u.email}{u.trade ? ` · ${u.trade}` : ""}</div>
                </td>
                <td className="px-5 py-3 text-steel-600">{CLASSIFICATION_LABELS[u.classification]}</td>
                <td className="px-5 py-3 text-steel-600">{u.hourlyRate ? `${currency(u.hourlyRate)}/hr` : "—"}</td>
                <td className="px-5 py-3 text-xs text-steel-500">
                  {u.siteAssignments.map((s) => s.jobSite.name).join(", ") || "—"}
                </td>
                <td className="px-5 py-3">
                  {u.classification === "CONTRACTOR" ? (
                    <button
                      onClick={() => patch(u.id, { complianceDocsOnFile: !u.complianceDocsOnFile })}
                      className={`badge ${u.complianceDocsOnFile ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {u.complianceDocsOnFile ? "PAN/GSTIN on file" : "Docs missing"}
                    </button>
                  ) : (
                    <span className="text-xs text-steel-400">N/A</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => patch(u.id, { active: !u.active })}
                    className={`badge ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-steel-100 text-steel-600"}`}
                  >
                    {u.active ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-steel-400">
                  No workers on your crew yet — add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
