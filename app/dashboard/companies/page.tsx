"use client";

import { useEffect, useState, useCallback } from "react";
import { currency, currencyCompact } from "@/lib/format";

type Company = {
  id: string;
  name: string;
  city: string;
  gstin: string | null;
  plan: string;
  monthlyFee: number;
  active: boolean;
  admin: { fullName: string; email: string } | null;
  userCount: number;
  siteCount: number;
  projectCount: number;
};

type ProvisionNotice = { businessName: string; tempPassword: string };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<ProvisionNotice | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/companies", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoadError(data.error || "Could not load companies.");
      setCompanies([]);
    } else {
      setCompanies(data.companies ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const raw = sessionStorage.getItem("constructpay-provisioned");
    if (raw) {
      try {
        setNotice(JSON.parse(raw) as ProvisionNotice);
      } catch {
        /* ignore */
      }
      sessionStorage.removeItem("constructpay-provisioned");
    }
  }, [load]);

  async function remove(id: string, name: string) {
    if (!confirm(`Permanently delete "${name}" and all its users, sites, assets, and data? This cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Could not delete company.");
    }
    setDeletingId(null);
    await load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  if (loading) return <div className="text-sm text-steel-500">Loading…</div>;

  const activeMrr = companies.filter((c) => c.active).reduce((s, c) => s + c.monthlyFee, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Subscriber Companies</h1>
        <p className="mt-1 text-sm text-steel-500">
          Tenants subscribed to ConstructPay. Total active MRR: <span className="font-semibold text-steel-700">{currencyCompact(activeMrr)}</span>
        </p>
      </div>

      {notice && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <strong>{notice.businessName}</strong> is now a subscriber company. Admin temporary password
          (would be emailed): <code className="font-mono">{notice.tempPassword}</code>
        </div>
      )}

      {loadError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      )}

      {companies.length === 0 ? (
        <div className="card px-5 py-12 text-center text-sm text-steel-500">
          No subscriber companies yet. Approve a subscription request to provision the first tenant.
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {companies.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-steel-900">{c.name}</h2>
                <p className="text-xs text-steel-500">{c.city}{c.gstin ? ` · GSTIN ${c.gstin}` : ""}</p>
              </div>
              <span className={`badge ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-steel-100 text-steel-500"}`}>
                {c.active ? "Active" : "Suspended"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Metric label="Users" value={`${c.userCount}`} />
              <Metric label="Sites" value={`${c.siteCount}`} />
              <Metric label="Projects" value={`${c.projectCount}`} />
            </div>

            <div className="mt-4 rounded-lg bg-steel-50 px-3 py-2 text-xs text-steel-600">
              Admin: {c.admin ? `${c.admin.fullName} (${c.admin.email})` : "—"}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <select
                  value={c.plan}
                  onChange={(e) => patch(c.id, { plan: e.target.value })}
                  className="rounded-md border border-steel-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="Growth">Growth</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
                <span className="text-sm font-semibold text-steel-900">{currency(c.monthlyFee)}/mo</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => patch(c.id, { active: !c.active })}
                  className={c.active ? "btn-secondary px-3 py-1.5 text-xs" : "btn-success px-3 py-1.5 text-xs"}
                >
                  {c.active ? "Suspend" : "Activate"}
                </button>
                <button
                  onClick={() => remove(c.id, c.name)}
                  disabled={deletingId === c.id}
                  className="btn-danger px-3 py-1.5 text-xs"
                >
                  {deletingId === c.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-steel-200 py-2">
      <div className="text-lg font-bold text-steel-900">{value}</div>
      <div className="text-xs text-steel-500">{label}</div>
    </div>
  );
}
