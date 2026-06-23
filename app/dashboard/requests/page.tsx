"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ROLE_LABELS } from "@/lib/constants";
import { dateShort } from "@/lib/format";

type Request = {
  id: string;
  fullName: string;
  businessName: string;
  roleRequested: string;
  email: string;
  phone: string | null;
  city: string | null;
  employees: string | null;
  useCase: string | null;
  status: string;
  createdAt: string;
};

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/access-requests", { cache: "no-store" });
    const data = await res.json();
    setRequests(data.requests ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string, businessName: string) {
    if (!confirm(`Remove this denied subscription request for "${businessName}"?`)) return;
    setBusyId(id);
    const res = await fetch(`/api/access-requests/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Could not remove.");
    }
    await load();
    setBusyId(null);
  }

  async function act(id: string, action: "APPROVE" | "DENY") {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/access-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not process request.");
      setBusyId(null);
      return;
    }
    if (action === "APPROVE") {
      sessionStorage.setItem(
        "constructpay-provisioned",
        JSON.stringify({
          businessName: data.businessName,
          tempPassword: data.tempPassword,
        })
      );
      router.push("/dashboard/companies");
      return;
    }
    await load();
    setBusyId(null);
  }

  if (loading) return <div className="text-sm text-steel-500">Loading…</div>;

  const pending = requests.filter((r) => r.status === "PENDING");
  const denied = requests.filter((r) => r.status === "DENIED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Subscription Requests</h1>
        <p className="mt-1 text-sm text-steel-500">
          Businesses are never self-onboarded. Approving provisions a company tenant and sends you to the Companies tab.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card">
        <div className="border-b border-steel-200 px-5 py-4">
          <h2 className="font-semibold text-steel-900">Pending ({pending.length})</h2>
        </div>
        {pending.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-steel-500">No pending requests.</p>
        ) : (
          <div className="divide-y divide-steel-100">
            {pending.map((r) => (
              <div key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-steel-900">
                    {r.fullName} <span className="text-steel-400">·</span> {r.businessName}
                  </div>
                  <div className="mt-0.5 text-sm text-steel-500">
                    {r.email}{r.phone ? ` · ${r.phone}` : ""}{r.city ? ` · ${r.city}` : ""} · Requested: {ROLE_LABELS[r.roleRequested] ?? r.roleRequested}
                    {r.employees ? ` · ${r.employees} employees` : ""}
                  </div>
                  {r.useCase && <p className="mt-1.5 max-w-2xl text-sm text-steel-600">“{r.useCase}”</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => act(r.id, "APPROVE")} disabled={busyId === r.id} className="btn-success px-3 py-1.5 text-xs">
                    Approve &amp; provision
                  </button>
                  <button onClick={() => act(r.id, "DENY")} disabled={busyId === r.id} className="btn-secondary px-3 py-1.5 text-xs">
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {denied.length > 0 && (
        <div className="card">
          <div className="border-b border-steel-200 px-5 py-4">
            <h2 className="font-semibold text-steel-900">Denied</h2>
          </div>
          <div className="divide-y divide-steel-100">
            {denied.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <div className="font-medium text-steel-900">{r.fullName} · {r.businessName}</div>
                  <div className="text-xs text-steel-500">{r.email} · {dateShort(r.createdAt)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={r.status} />
                  <button
                    onClick={() => remove(r.id, r.businessName)}
                    disabled={busyId === r.id}
                    className="btn-danger px-3 py-1.5 text-xs"
                  >
                    {busyId === r.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
