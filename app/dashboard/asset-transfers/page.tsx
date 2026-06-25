"use client";

import { useCallback, useEffect, useState } from "react";
import { TRANSFER_STATUS_LABELS } from "@/lib/constants";
import { currency, dateShort } from "@/lib/format";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

type TransferItem = {
  assetTagId: string;
  description: string;
  cost: number;
};

type Transfer = {
  id: string;
  status: string;
  reason: string | null;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  fromJobSite: { id: string; name: string };
  toJobSite: { id: string; name: string };
  requester: { fullName: string };
  reviewer: { fullName: string } | null;
  items: TransferItem[];
};

type Site = { id: string; name: string };

type SummaryRow = {
  siteId: string;
  siteName: string;
  outbound: number;
  inbound: number;
  pendingOutbound: number;
  outboundValue: number;
  inboundValue: number;
};

export default function AssetTransfersPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [requests, setRequests] = useState<Transfer[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState("");
  const [direction, setDirection] = useState("any");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (siteId) params.set("siteId", siteId);
    if (direction) params.set("direction", direction);
    if (status) params.set("status", status);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);

    const [sRes, rRes, sumRes] = await Promise.all([
      fetch("/api/sites"),
      fetch(`/api/assets/transfers?${params}`),
      fetch(`/api/assets/transfers?summary=1&${params}`),
    ]);
    const s = await sRes.json();
    const r = await rRes.json();
    const sum = await sumRes.json();
    setSites(s.sites ?? []);
    setRequests(r.requests ?? []);
    setSummary(sum.summary ?? []);
    setLoading(false);
  }, [siteId, direction, status, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && requests.length === 0) {
    return <div className="text-sm text-steel-500">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Asset Transfer Reports</h1>
        <p className="mt-1 text-sm text-steel-500">
          Site-wise inbound and outbound transfer history. All cross-site moves require company admin approval.
        </p>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <div>
          <label className="label">Job site</label>
          <select className="input min-w-[10rem]" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Direction</label>
          <select className="input min-w-[8rem]" value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="any">Any</option>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input min-w-[8rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {Object.entries(TRANSFER_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From date</label>
          <input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To date</label>
          <input type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      {summary.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="border-b border-steel-200 px-5 py-4">
            <h2 className="font-semibold text-steel-900">Site summary</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-steel-50 text-left text-xs uppercase text-steel-500">
              <tr>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Outbound</th>
                <th className="px-4 py-3">Inbound</th>
                <th className="px-4 py-3">Pending out</th>
                <th className="px-4 py-3">Value out</th>
                <th className="px-4 py-3">Value in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {summary.map((row) => (
                <tr key={row.siteId}>
                  <td className="px-4 py-3 font-medium text-steel-900">{row.siteName}</td>
                  <td className="px-4 py-3">{row.outbound}</td>
                  <td className="px-4 py-3">{row.inbound}</td>
                  <td className="px-4 py-3">{row.pendingOutbound}</td>
                  <td className="px-4 py-3">{currency(row.outboundValue)}</td>
                  <td className="px-4 py-3">{currency(row.inboundValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="border-b border-steel-200 px-5 py-4">
          <h2 className="font-semibold text-steel-900">Transfer history ({requests.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-steel-50 text-left text-xs uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">From → To</th>
              <th className="px-4 py-3">Assets</th>
              <th className="px-4 py-3">Requester</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-steel-600">{dateShort(r.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-steel-900">{r.fromJobSite.name}</span>
                  <span className="text-steel-400"> → </span>
                  <span className="font-medium text-steel-900">{r.toJobSite.name}</span>
                  {r.reason && <div className="text-xs text-steel-500">{r.reason}</div>}
                  {r.rejectReason && <div className="text-xs text-red-600">{r.rejectReason}</div>}
                </td>
                <td className="px-4 py-3 text-steel-600">
                  {r.items.map((i) => i.assetTagId).join(", ")}
                  <div className="text-xs text-steel-400">{r.items.length} item(s)</div>
                </td>
                <td className="px-4 py-3 text-steel-600">{r.requester.fullName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                  {r.reviewer && (
                    <div className="mt-1 text-xs text-steel-400">by {r.reviewer.fullName}</div>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-steel-400">
                  No transfers match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
