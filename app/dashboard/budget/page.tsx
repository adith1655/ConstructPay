"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLES, BUDGET_AUDIT_ACTION_LABELS, ROLE_LABELS } from "@/lib/constants";
import { currency, hours } from "@/lib/format";

type CostCode = {
  id: string;
  code: string;
  description: string;
  budgetHours: number;
  budgetCost: number;
};

type Project = {
  id: string;
  name: string;
  jobSite: { id: string; name: string; budgetLimit: number };
  costCodes: CostCode[];
};

type AuditEntry = {
  id: string;
  action: string;
  code: string;
  description: string | null;
  budgetHours: number;
  budgetCost: number;
  createdAt: string;
  performer: { fullName: string; role: string };
};

export default function BudgetAuditPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/budget");
    const data = await res.json();
    setProjects(data.projects ?? []);
    setAuditLog(data.auditLog ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.role ?? ""))
      .catch(() => {});
  }, [load]);

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not add budget item.");
      return;
    }
    setShowAdd(false);
    form.reset();
    await load();
  }

  async function updateItem(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch(`/api/budget/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not update budget item.");
      return;
    }
    setEditId(null);
    await load();
  }

  async function removeItem(id: string, code: string) {
    if (!confirm(`Remove budget line "${code}"? Only company admins can remove items.`)) return;
    const res = await fetch(`/api/budget/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not remove budget item.");
      return;
    }
    await load();
  }

  const isAdmin = role === ROLES.ADMIN;

  if (loading) return <div className="text-sm text-steel-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-steel-900">Budget Audit</h1>
          <p className="mt-1 text-sm text-steel-500">
            Add and adjust project budget line items. Company admins can also remove lines; site managers can add and update only.
          </p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="btn-primary">
          {showAdd ? "Close" : "+ Add Budget Item"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {showAdd && projects.length > 0 && (
        <form onSubmit={addItem} className="card grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          <div>
            <label className="label">Project</label>
            <select name="projectId" required className="input" defaultValue={projects[0]?.id}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.jobSite.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Job site ID</label>
            <select name="jobSiteId" required className="input" defaultValue={projects[0]?.jobSite.id}>
              {projects.map((p) => (
                <option key={p.jobSite.id} value={p.jobSite.id}>
                  {p.jobSite.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cost code</label>
            <input name="code" required className="input" placeholder="e.g. RCC-300" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <input name="description" required className="input" placeholder="Line item description" />
          </div>
          <div>
            <label className="label">Budget hours</label>
            <input name="budgetHours" type="number" min="0" step="1" defaultValue="0" className="input" />
          </div>
          <div>
            <label className="label">Budget cost (₹)</label>
            <input name="budgetCost" type="number" min="0" step="1" defaultValue="0" className="input" />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <button type="submit" className="btn-primary">Add to budget</button>
          </div>
        </form>
      )}

      {projects.map((p) => (
        <div key={p.id} className="card overflow-hidden">
          <div className="border-b border-steel-200 px-5 py-4">
            <h2 className="font-semibold text-steel-900">{p.name}</h2>
            <p className="text-xs text-steel-500">
              {p.jobSite.name}
              {p.jobSite.budgetLimit > 0 && ` · Site cap ${currency(p.jobSite.budgetLimit)}`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Budget Hrs</th>
                  <th className="px-5 py-3 font-medium">Budget Cost</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {p.costCodes.map((c) => (
                  <tr key={c.id}>
                    {editId === c.id ? (
                      <td colSpan={4} className="px-5 py-3">
                        <form
                          onSubmit={(e) => updateItem(e, c.id)}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-5"
                        >
                          <input name="code" defaultValue={c.code} className="input" required />
                          <input name="description" defaultValue={c.description} className="input" required />
                          <input name="budgetHours" type="number" defaultValue={c.budgetHours} className="input" />
                          <input name="budgetCost" type="number" defaultValue={c.budgetCost} className="input" />
                          <div className="flex gap-2">
                            <button type="submit" className="btn-primary text-xs">Save</button>
                            <button type="button" onClick={() => setEditId(null)} className="btn-secondary text-xs">Cancel</button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-5 py-3">
                          <div className="font-medium text-steel-900">{c.code}</div>
                          <div className="text-xs text-steel-500">{c.description}</div>
                        </td>
                        <td className="px-5 py-3 text-steel-600">{hours(c.budgetHours)}</td>
                        <td className="px-5 py-3 text-steel-600">{currency(c.budgetCost)}</td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => setEditId(c.id)} className="btn-ghost text-xs">Edit</button>
                            {isAdmin && (
                              <button onClick={() => removeItem(c.id, c.code)} className="btn-danger text-xs">
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {p.costCodes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-steel-400">
                      No budget lines yet — add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="card overflow-hidden">
        <div className="border-b border-steel-200 px-5 py-4">
          <h2 className="font-semibold text-steel-900">Audit Trail</h2>
          <p className="text-xs text-steel-500">Recent budget add, update, and remove actions.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-500">
              <tr>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {auditLog.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3 text-xs text-steel-500">
                    {new Date(a.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-3">
                    <span className="badge bg-steel-100 text-steel-700">
                      {BUDGET_AUDIT_ACTION_LABELS[a.action] ?? a.action}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-steel-900">{a.code}</div>
                    {a.description && <div className="text-xs text-steel-500">{a.description}</div>}
                  </td>
                  <td className="px-5 py-3 text-steel-600">{currency(a.budgetCost)}</td>
                  <td className="px-5 py-3 text-xs text-steel-500">
                    {a.performer.fullName}
                    <span className="text-steel-400"> · {ROLE_LABELS[a.performer.role] ?? a.performer.role}</span>
                  </td>
                </tr>
              ))}
              {auditLog.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-steel-400">No audit entries yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
