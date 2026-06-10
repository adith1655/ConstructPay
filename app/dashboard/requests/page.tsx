"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/access-requests");
    const data = await res.json();
    setRequests(data.requests ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "APPROVE" | "DENY") {
    setBusyId(id);
    setNotice(null);
    const res = await fetch(`/api/access-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.tempPassword) {
      setNotice(`Company tenant + Admin account provisioned. Temporary password (would be emailed): ${data.tempPassword}`);
    }
    await load();
    setBusyId(null);
  }

  if (loading) return <div className="text-sm text-steel-500">Loading…</div>;

  const pending = requests.filter((r) => r.status === "PENDING");
  const processed = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Subscription Requests</h1>
        <p className="mt-1 text-sm text-steel-500">
          Businesses are never self-onboarded. Approving a request provisions a new company tenant and its Admin account.
        </p>
      </div>

      {notice && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>
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

      {processed.length > 0 && (
        <div className="card">
          <div className="border-b border-steel-200 px-5 py-4">
            <h2 className="font-semibold text-steel-900">Processed</h2>
          </div>
          <div className="divide-y divide-steel-100">
            {processed.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="font-medium text-steel-900">{r.fullName} · {r.businessName}</div>
                  <div className="text-xs text-steel-500">{r.email} · {dateShort(r.createdAt)}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
