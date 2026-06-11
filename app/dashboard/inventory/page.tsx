"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLES, INDENT_STATUS_LABELS } from "@/lib/constants";

type CatalogItem = { id: string; name: string; sku: string; unitOfMeasure: string; minStockLevel: number };
type Site = { id: string; name: string; costCodes: { id: string; code: string; description: string }[] };
type StockRow = {
  id: string;
  quantityAvailable: number;
  lastUpdated: string;
  inventoryItem: CatalogItem;
};
type Indent = {
  id: string;
  status: string;
  createdAt: string;
  items: { item_id: string; qty: number }[];
  jobSite: { name: string };
  requester: { fullName: string };
};

export default function InventoryPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState("");
  const [stock, setStock] = useState<StockRow[]>([]);
  const [indents, setIndents] = useState<Indent[]>([]);
  const [role, setRole] = useState("");
  const [tab, setTab] = useState<"stock" | "indent" | "grn" | "consume">("stock");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadBase = useCallback(async () => {
    const [catRes, sitesRes, indentsRes] = await Promise.all([
      fetch("/api/inventory/catalog"),
      fetch("/api/sites"),
      fetch("/api/inventory/indents"),
    ]);
    const cat = await catRes.json();
    const siteData = await sitesRes.json();
    const indentData = await indentsRes.json();
    setCatalog(cat.items ?? []);
    setSites(siteData.sites ?? []);
    setIndents(indentData.indents ?? []);
    if (siteData.sites?.length && !siteId) setSiteId(siteData.sites[0].id);
  }, [siteId]);

  const loadStock = useCallback(async (id: string) => {
    if (!id) return;
    const res = await fetch(`/api/inventory/site/${id}`);
    const data = await res.json();
    setStock(data.stock ?? []);
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (siteId) loadStock(siteId);
  }, [siteId, loadStock]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.role ?? ""))
      .catch(() => {});
  }, []);

  async function submitIndent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    const itemId = String(fd.get("itemId"));
    const qty = Number(fd.get("qty"));
    const res = await fetch("/api/inventory/indents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, items: [{ item_id: itemId, qty }] }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not create indent.");
      return;
    }
    setSuccess("Material indent submitted.");
    e.currentTarget.reset();
    await loadBase();
  }

  async function submitGrn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/inventory/grn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId,
        indentId: fd.get("indentId") || undefined,
        vendorName: fd.get("vendorName"),
        invoiceOrChallan: fd.get("invoiceOrChallan"),
        itemsReceived: [
          {
            item_id: fd.get("itemId"),
            qty_received: Number(fd.get("qty")),
            unit_price: Number(fd.get("unitPrice") || 0),
          },
        ],
      }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not log goods receipt.");
      return;
    }
    setSuccess("Goods receipt logged — stock updated.");
    e.currentTarget.reset();
    await loadBase();
    await loadStock(siteId);
  }

  async function submitConsume(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/inventory/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId,
        itemId: fd.get("itemId"),
        quantity: Number(fd.get("qty")),
        costCodeId: fd.get("costCodeId"),
      }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not log consumption.");
      return;
    }
    const b = await res.json();
    setSuccess(`Consumption logged. Remaining: ${b.remaining}`);
    e.currentTarget.reset();
    await loadStock(siteId);
  }

  async function updateIndentStatus(id: string, status: string) {
    const res = await fetch(`/api/inventory/indents/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not update indent.");
      return;
    }
    await loadBase();
  }

  async function addCatalogItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/inventory/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not add catalog item.");
      return;
    }
    e.currentTarget.reset();
    await loadBase();
  }

  const selectedSite = sites.find((s) => s.id === siteId);
  const isAdmin = role === ROLES.ADMIN;
  const catalogMap = Object.fromEntries(catalog.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Inventory Ledger</h1>
        <p className="mt-1 text-sm text-steel-500">
          Real-time site stock, material indents, goods receipt (GRN), and consumption tied to cost codes.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-steel-700">Job site</label>
        <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="input max-w-xs">
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="flex gap-1 rounded-lg border border-steel-200 bg-white p-1">
          {(["stock", "indent", "grn", "consume"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
                tab === t ? "bg-brand-50 text-brand-700" : "text-steel-500 hover:bg-steel-50"
              }`}
            >
              {t === "grn" ? "GRN" : t}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {tab === "stock" && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-500">
              <tr>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium">On Hand</th>
                <th className="px-5 py-3 font-medium">Min Level</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {stock.map((row) => {
                const low = row.quantityAvailable < row.inventoryItem.minStockLevel;
                return (
                  <tr key={row.id}>
                    <td className="px-5 py-3 font-medium text-steel-900">{row.inventoryItem.name}</td>
                    <td className="px-5 py-3 text-steel-500">{row.inventoryItem.sku}</td>
                    <td className="px-5 py-3">
                      {row.quantityAvailable} {row.inventoryItem.unitOfMeasure}
                    </td>
                    <td className="px-5 py-3 text-steel-500">{row.inventoryItem.minStockLevel}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${low ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {low ? "Low stock" : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {stock.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-steel-400">
                    No stock on this site yet — log a goods receipt to inward materials.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "indent" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={submitIndent} className="card space-y-3 p-5">
            <h2 className="font-semibold text-steel-900">Request Materials (Indent)</h2>
            <div>
              <label className="label">Item</label>
              <select name="itemId" required className="input">
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.sku})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input name="qty" type="number" min="1" required className="input" />
            </div>
            <button type="submit" className="btn-primary">Submit indent</button>
          </form>
          <div className="card overflow-x-auto">
            <div className="border-b border-steel-200 px-5 py-3 font-semibold text-steel-900">Recent indents</div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-steel-100">
                {indents.filter((i) => !siteId || true).map((i) => (
                  <tr key={i.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-steel-900">{i.jobSite.name}</div>
                      <div className="text-xs text-steel-500">
                        {i.items.map((it) => `${catalogMap[it.item_id]?.name ?? it.item_id} × ${it.qty}`).join(", ")}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge bg-steel-100 text-steel-700">
                        {INDENT_STATUS_LABELS[i.status] ?? i.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isAdmin && i.status === "PENDING" && (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => updateIndentStatus(i.id, "APPROVED")} className="btn-success text-xs">Approve</button>
                          <button onClick={() => updateIndentStatus(i.id, "REJECTED")} className="btn-danger text-xs">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "grn" && (
        <form onSubmit={submitGrn} className="card grid max-w-2xl grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-semibold text-steel-900">Goods Receipt (GRN)</h2>
          <div>
            <label className="label">Vendor</label>
            <input name="vendorName" required className="input" />
          </div>
          <div>
            <label className="label">Invoice / Challan no.</label>
            <input name="invoiceOrChallan" required className="input" />
          </div>
          <div>
            <label className="label">Item</label>
            <select name="itemId" required className="input">
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Qty received</label>
            <input name="qty" type="number" min="1" required className="input" />
          </div>
          <div>
            <label className="label">Unit price (₹)</label>
            <input name="unitPrice" type="number" min="0" className="input" defaultValue="0" />
          </div>
          <div>
            <label className="label">Link indent (optional)</label>
            <select name="indentId" className="input">
              <option value="">— None —</option>
              {indents.filter((i) => i.status === "APPROVED").map((i) => (
                <option key={i.id} value={i.id}>{i.jobSite.name} — {new Date(i.createdAt).toLocaleDateString("en-IN")}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Log receipt &amp; update stock</button>
          </div>
        </form>
      )}

      {tab === "consume" && (
        <form onSubmit={submitConsume} className="card grid max-w-2xl grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-semibold text-steel-900">Log Consumption</h2>
          <div>
            <label className="label">Item</label>
            <select name="itemId" required className="input">
              {stock.map((s) => (
                <option key={s.inventoryItem.id} value={s.inventoryItem.id}>
                  {s.inventoryItem.name} ({s.quantityAvailable} available)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quantity used</label>
            <input name="qty" type="number" min="0.01" step="0.01" required className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Cost code</label>
            <select name="costCodeId" required className="input">
              {selectedSite?.costCodes.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.code} — {cc.description}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Record consumption</button>
          </div>
        </form>
      )}

      {isAdmin && (
        <form onSubmit={addCatalogItem} className="card grid grid-cols-1 gap-3 p-5 sm:grid-cols-4">
          <h2 className="sm:col-span-4 font-semibold text-steel-900">Add catalog item (Admin)</h2>
          <div><label className="label">Name</label><input name="name" required className="input" /></div>
          <div><label className="label">SKU</label><input name="sku" required className="input" /></div>
          <div><label className="label">Unit</label><input name="unitOfMeasure" required className="input" placeholder="Bags, KG…" /></div>
          <div><label className="label">Min stock</label><input name="minStockLevel" type="number" min="0" defaultValue="0" className="input" /></div>
          <div className="sm:col-span-4"><button type="submit" className="btn-secondary">Add to master catalog</button></div>
        </form>
      )}
    </div>
  );
}
