"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLES } from "@/lib/constants";
import { currency } from "@/lib/format";

type Lookup = { id: string; name: string };
type Site = { id: string; name: string };
type Asset = {
  id: string;
  description: string;
  assetTagId: string;
  cost: number;
  brand: string;
  model: string;
  serialNo: string;
  photoUrl: string | null;
  jobSite: { id: string; name: string };
  location: Lookup | null;
  category: Lookup | null;
  department: Lookup | null;
};

type Draft = {
  description: string;
  assetTagId: string;
  purchaseDate: string;
  purchasedFrom: string;
  cost: number;
  brand: string;
  model: string;
  serialNo: string;
  sourceBillUrl: string;
  jobSiteId: string;
};

type EditRequest = {
  id: string;
  status: string;
  payload: string;
  asset: { id: string; assetTagId: string; description: string };
  requester: { fullName: string };
};

const emptyForm = {
  jobSiteId: "",
  locationId: "",
  categoryId: "",
  departmentId: "",
  description: "",
  assetTagId: "",
  purchaseDate: "",
  purchasedFrom: "",
  cost: "0",
  brand: "",
  model: "",
  serialNo: "",
  photoUrl: "",
  sourceBillUrl: "",
  maintenanceDueDate: "",
  warrantyExpiryDate: "",
};

export default function AssetsPage() {
  const [role, setRole] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [locations, setLocations] = useState<Lookup[]>([]);
  const [categories, setCategories] = useState<Lookup[]>([]);
  const [departments, setDepartments] = useState<Lookup[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [draftQueue, setDraftQueue] = useState<Draft[]>([]);
  const [draftIndex, setDraftIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [pendingEdits, setPendingEdits] = useState<EditRequest[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; read: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<{ action: string; createdAt: string; performer: { fullName: string } }[]>([]);
  const [workers, setWorkers] = useState<{ id: string; fullName: string }[]>([]);
  const [assignWorkerId, setAssignWorkerId] = useState("");
  const [adminEdit, setAdminEdit] = useState({ description: "", cost: "" });

  const loadLookups = useCallback(async () => {
    const [l, c, d] = await Promise.all([
      fetch("/api/assets/lookups/locations").then((r) => r.json()),
      fetch("/api/assets/lookups/categories").then((r) => r.json()),
      fetch("/api/assets/lookups/departments").then((r) => r.json()),
    ]);
    setLocations(l.items ?? []);
    setCategories(c.items ?? []);
    setDepartments(d.items ?? []);
  }, []);

  const load = useCallback(async () => {
    const [aRes, sRes, nRes] = await Promise.all([
      fetch("/api/assets"),
      fetch("/api/sites"),
      fetch("/api/notifications"),
    ]);
    const a = await aRes.json();
    const s = await sRes.json();
    const n = await nRes.json();
    setAssets(a.assets ?? []);
    setReadOnly(!!a.readOnly);
    setSites(s.sites ?? []);
    setNotifications(n.notifications ?? []);
    if (s.sites?.length && !form.jobSiteId) {
      setForm((f) => ({ ...f, jobSiteId: s.sites[0].id }));
    }
  }, [form.jobSiteId]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.role ?? ""))
      .catch(() => {});
    load();
    loadLookups();
  }, [load, loadLookups]);

  useEffect(() => {
    if (role === ROLES.SITE_MANAGER) {
      fetch("/api/assets/edit-requests")
        .then((r) => r.json())
        .then((d) => setPendingEdits(d.requests ?? []));
      fetch("/api/users?role=WORKER")
        .then((r) => r.json())
        .then((d) => setWorkers(d.users ?? []));
    }
  }, [role]);

  useEffect(() => {
    if (!selected) {
      setAuditLogs([]);
      return;
    }
    fetch(`/api/assets/${selected.id}`)
      .then((r) => r.json())
      .then((d) => {
        setAuditLogs(d.asset?.auditLogs ?? []);
        if (role === ROLES.ADMIN) {
          setAdminEdit({ description: selected.description, cost: String(selected.cost) });
        }
      });
  }, [selected, role]);

  async function generateTag() {
    const res = await fetch("/api/assets/generate-tag");
    const data = await res.json();
    if (data.tag) setForm((f) => ({ ...f, assetTagId: data.tag }));
  }

  function applyDraft(draft: Draft) {
    setForm({
      ...emptyForm,
      jobSiteId: draft.jobSiteId || form.jobSiteId,
      description: draft.description || "",
      assetTagId: draft.assetTagId || "",
      purchaseDate: draft.purchaseDate || "",
      purchasedFrom: draft.purchasedFrom || "",
      cost: String(draft.cost || 0),
      brand: draft.brand || "",
      model: draft.model || "",
      serialNo: draft.serialNo || "",
      sourceBillUrl: draft.sourceBillUrl || "",
    });
    setShowForm(true);
  }

  async function addLookup(type: string) {
    const name = prompt(`New ${type} name:`);
    if (!name?.trim()) return;
    const res = await fetch(`/api/assets/lookups/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) await loadLookups();
  }

  async function uploadPhoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "photo");
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) setForm((f) => ({ ...f, photoUrl: data.url }));
  }

  async function scanBill(file: File) {
    setScanning(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("jobSiteId", form.jobSiteId);
    const res = await fetch("/api/assets/scan-bill", { method: "POST", body: fd });
    const data = await res.json();
    setScanning(false);
    if (!res.ok) {
      setError(data.error || "Scan failed.");
      return;
    }
    setSuccess(data.message);
    if (data.assetDrafts?.length) {
      setDraftQueue(data.assetDrafts);
      setDraftIndex(0);
      applyDraft(data.assetDrafts[0]);
    }
    await load();
  }

  async function submitAsset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cost: Number(form.cost),
        locationId: form.locationId || null,
        categoryId: form.categoryId || null,
        departmentId: form.departmentId || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not save asset.");
      return;
    }
    setSuccess("Asset saved.");
    if (draftQueue.length > draftIndex + 1) {
      const next = draftIndex + 1;
      setDraftIndex(next);
      applyDraft(draftQueue[next]);
    } else {
      setDraftQueue([]);
      setShowForm(false);
      setForm(emptyForm);
    }
    await load();
  }

  async function retireAsset(id: string) {
    if (!confirm("Retire this asset?")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    setSelected(null);
    await load();
  }

  async function updateAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    const res = await fetch(`/api/assets/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        cost: Number(form.cost),
        locationId: form.locationId || null,
        categoryId: form.categoryId || null,
        departmentId: form.departmentId || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not update asset.");
      return;
    }
    setSuccess("Asset updated.");
    setEditing(false);
    await load();
    setSelected(data.asset);
  }

  function startEdit() {
    if (!selected) return;
    setForm({
      jobSiteId: selected.jobSite.id,
      locationId: selected.location?.id ?? "",
      categoryId: selected.category?.id ?? "",
      departmentId: selected.department?.id ?? "",
      description: selected.description,
      assetTagId: selected.assetTagId,
      purchaseDate: "",
      purchasedFrom: "",
      cost: String(selected.cost),
      brand: selected.brand,
      model: selected.model,
      serialNo: selected.serialNo,
      photoUrl: selected.photoUrl ?? "",
      sourceBillUrl: "",
      maintenanceDueDate: "",
      warrantyExpiryDate: "",
    });
    setEditing(true);
    setShowForm(false);
  }

  async function assignWorker() {
    if (!selected || !assignWorkerId) return;
    await fetch("/api/assets/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: selected.id, userId: assignWorkerId }),
    });
    setSuccess("Worker assigned to asset.");
    setAssignWorkerId("");
  }

  async function requestEdit() {
    if (!selected) return;
    const res = await fetch("/api/assets/edit-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: selected.id,
        payload: {
          description: adminEdit.description,
          cost: Number(adminEdit.cost),
        },
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Request failed.");
      return;
    }
    setSuccess("Edit request sent to site manager.");
  }

  async function resolveEdit(id: string, action: "APPLY" | "REJECT") {
    await fetch(`/api/assets/edit-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    const r = await fetch("/api/assets/edit-requests");
    const d = await r.json();
    setPendingEdits(d.requests ?? []);
  }

  const isSiteManager = role === ROLES.SITE_MANAGER;
  const isAdmin = role === ROLES.ADMIN;
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-steel-900">Fixed Assets</h1>
          <p className="mt-1 text-sm text-steel-500">
            {isSuperAdmin
              ? "Platform-wide read-only view of all tenant assets."
              : isAdmin
              ? "View-only across all sites. Request edits routed to site managers."
              : "Manage equipment and tools at your job sites."}
          </p>
        </div>
        {isSiteManager && (
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
            {showForm ? "Close" : "+ Add Asset"}
          </button>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {notifications.filter((n) => !n.read).length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-steel-900">Alerts</h2>
          <ul className="mt-2 space-y-2 text-sm text-steel-600">
            {notifications.filter((n) => !n.read).slice(0, 5).map((n) => (
              <li key={n.id}>
                <span className="font-medium">{n.title}</span> — {n.body}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isSiteManager && pendingEdits.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-steel-900">Pending edit requests</h2>
          <ul className="mt-2 space-y-2">
            {pendingEdits.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {r.asset.assetTagId} — {r.asset.description} (from {r.requester.fullName})
                </span>
                <div className="flex gap-2">
                  <button onClick={() => resolveEdit(r.id, "APPLY")} className="btn-success text-xs">Apply</button>
                  <button onClick={() => resolveEdit(r.id, "REJECT")} className="btn-danger text-xs">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showForm && isSiteManager && (
        <form onSubmit={submitAsset} className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-steel-900">Add Asset</h2>
            <label className="btn-secondary cursor-pointer text-xs">
              {scanning ? "Scanning…" : "Scan Bill"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={scanning}
                onChange={(e) => e.target.files?.[0] && scanBill(e.target.files[0])}
              />
            </label>
          </div>
          {draftQueue.length > 0 && (
            <p className="text-xs text-brand-700">
              Reviewing draft {draftIndex + 1} of {draftQueue.length} from bill scan
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Site *</label>
              <select required className="input" value={form.jobSiteId} onChange={(e) => setForm({ ...form, jobSiteId: e.target.value })}>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <LookupField label="Location" value={form.locationId} items={locations} onChange={(v) => setForm({ ...form, locationId: v })} onAdd={() => addLookup("locations")} />
            <LookupField label="Category" value={form.categoryId} items={categories} onChange={(v) => setForm({ ...form, categoryId: v })} onAdd={() => addLookup("categories")} />
            <LookupField label="Department" value={form.departmentId} items={departments} onChange={(v) => setForm({ ...form, departmentId: v })} onAdd={() => addLookup("departments")} />
            <div className="sm:col-span-2">
              <label className="label">Description *</label>
              <input required className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Asset Tag ID *</label>
              <div className="flex gap-2">
                <input required className="input flex-1" value={form.assetTagId} onChange={(e) => setForm({ ...form, assetTagId: e.target.value })} />
                <button type="button" onClick={generateTag} className="btn-secondary text-xs shrink-0">Auto</button>
              </div>
            </div>
            <div>
              <label className="label">Purchase Date</label>
              <input type="date" className="input" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Purchased from</label>
              <input className="input" value={form.purchasedFrom} onChange={(e) => setForm({ ...form, purchasedFrom: e.target.value })} />
            </div>
            <div>
              <label className="label">Cost (₹)</label>
              <input type="number" min="0" className="input" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <div>
              <label className="label">Brand *</label>
              <input required className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div>
              <label className="label">Model *</label>
              <input required className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div>
              <label className="label">Serial No *</label>
              <input required className="input" value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} />
            </div>
            <div>
              <label className="label">Photo (JPG/PNG/GIF)</label>
              <input type="file" accept="image/jpeg,image/png,image/gif" className="input" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
            </div>
            <div>
              <label className="label">Maintenance due</label>
              <input type="date" className="input" value={form.maintenanceDueDate} onChange={(e) => setForm({ ...form, maintenanceDueDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Warranty expiry</label>
              <input type="date" className="input" value={form.warrantyExpiryDate} onChange={(e) => setForm({ ...form, warrantyExpiryDate: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn-primary">Submit asset</button>
        </form>
      )}

      {editing && isSiteManager && selected && (
        <form onSubmit={updateAsset} className="card space-y-4 p-5">
          <h2 className="font-semibold text-steel-900">Edit Asset — {selected.assetTagId}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Description *</label>
              <input required className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Cost (₹)</label>
              <input type="number" min="0" className="input" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <LookupField label="Location" value={form.locationId} items={locations} onChange={(v) => setForm({ ...form, locationId: v })} onAdd={() => addLookup("locations")} />
            <LookupField label="Category" value={form.categoryId} items={categories} onChange={(v) => setForm({ ...form, categoryId: v })} onAdd={() => addLookup("categories")} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Save changes</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="bg-steel-50 text-left text-xs uppercase text-steel-500">
              <tr>
                <th className="px-4 py-3">Tag / Description</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {assets.map((a) => (
                <tr key={a.id} className={`cursor-pointer hover:bg-steel-50 ${selected?.id === a.id ? "bg-brand-50" : ""}`} onClick={() => setSelected(a)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-steel-900">{a.assetTagId}</div>
                    <div className="text-xs text-steel-500">{a.description}</div>
                  </td>
                  <td className="px-4 py-3 text-steel-600">{a.jobSite.name}</td>
                  <td className="px-4 py-3">{currency(a.cost)}</td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-steel-400">No assets yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="card p-4 text-sm">
            <h2 className="font-semibold text-steel-900">{selected.assetTagId}</h2>
            <p className="text-steel-500">{selected.description}</p>
            {selected.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.photoUrl} alt="" className="mt-3 max-h-32 rounded-lg object-cover" />
            )}
            <dl className="mt-3 space-y-1 text-steel-600">
              <div><dt className="inline font-medium">Brand: </dt>{selected.brand} {selected.model}</div>
              <div><dt className="inline font-medium">Serial: </dt>{selected.serialNo}</div>
              <div><dt className="inline font-medium">Site: </dt>{selected.jobSite.name}</div>
              <div><dt className="inline font-medium">Location: </dt>{selected.location?.name ?? "—"}</div>
            </dl>
            {isSiteManager && !readOnly && (
              <div className="mt-4 space-y-2">
                <button onClick={startEdit} className="btn-secondary w-full text-xs">Edit asset</button>
                <button onClick={() => retireAsset(selected.id)} className="btn-danger w-full text-xs">Retire asset</button>
                <label className="label">Assign to worker</label>
                <div className="flex gap-2">
                  <select className="input flex-1" value={assignWorkerId} onChange={(e) => setAssignWorkerId(e.target.value)}>
                    <option value="">Select worker…</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>{w.fullName}</option>
                    ))}
                  </select>
                  <button type="button" onClick={assignWorker} className="btn-secondary text-xs">Assign</button>
                </div>
              </div>
            )}
            {isAdmin && (
              <div className="mt-4 space-y-2">
                <label className="label">Request edit</label>
                <input className="input" value={adminEdit.description} onChange={(e) => setAdminEdit({ ...adminEdit, description: e.target.value })} placeholder="Description" />
                <input className="input" type="number" value={adminEdit.cost} onChange={(e) => setAdminEdit({ ...adminEdit, cost: e.target.value })} placeholder="Cost (₹)" />
                <button onClick={requestEdit} className="btn-secondary w-full text-xs">Send to site manager</button>
              </div>
            )}
            {auditLogs.length > 0 && (
              <div className="mt-4 border-t border-steel-100 pt-3">
                <h3 className="text-xs font-semibold uppercase text-steel-500">Audit trail</h3>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-steel-500">
                  {auditLogs.map((log, i) => (
                    <li key={i}>{log.action} · {log.performer.fullName} · {new Date(log.createdAt).toLocaleString("en-IN")}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LookupField({
  label,
  value,
  items,
  onChange,
  onAdd,
}: {
  label: string;
  value: string;
  items: Lookup[];
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <select className="input flex-1" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        <button type="button" onClick={onAdd} className="btn-ghost shrink-0 text-xs">+ New</button>
      </div>
    </div>
  );
}
