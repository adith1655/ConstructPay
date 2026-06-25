"use client";

import { useCallback, useEffect, useState } from "react";

type Site = {
  id: string;
  name: string;
  city: string;
  address: string | null;
};

type User = { id: string; fullName: string; role: string };

export default function JobSitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    const [sRes, mRes, wRes] = await Promise.all([
      fetch("/api/sites"),
      fetch("/api/users?role=SITE_MANAGER"),
      fetch("/api/users?role=WORKER"),
    ]);
    const s = await sRes.json();
    const m = await mRes.json();
    const w = await wRes.json();
    setSites(s.sites ?? []);
    setManagers(m.users ?? []);
    setWorkers(w.users ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createSite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Could not create site.");
      return;
    }
    setShowCreate(false);
    e.currentTarget.reset();
    await load();
  }

  async function assign(siteId: string, userId: string) {
    await fetch(`/api/sites/${siteId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    await load();
  }

  async function deactivate(siteId: string, siteName: string) {
    setError(null);
    const detailRes = await fetch(`/api/sites/${siteId}`);
    const detail = await detailRes.json().catch(() => ({}));
    if (!detailRes.ok) {
      setError(detail.error || "Could not load site details.");
      return;
    }
    const deps = detail.dependencies ?? {};
    const msg = [
      `Deactivate "${siteName}"?`,
      deps.activeAssets ? `${deps.activeAssets} active asset(s)` : null,
      deps.pendingTransfers ? `${deps.pendingTransfers} pending transfer(s)` : null,
      deps.openShifts ? `${deps.openShifts} open clock-in(s)` : null,
    ]
      .filter(Boolean)
      .join("\n");
    if (!confirm(msg)) return;

    const res = await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not deactivate site.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-steel-900">Job Sites</h1>
          <p className="mt-1 text-sm text-steel-500">
            Create job sites before adding assets, materials, or crew assignments.
          </p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className="btn-primary">
          {showCreate ? "Close" : "+ Add Job Site"}
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {showCreate && (
        <form onSubmit={createSite} className="card grid gap-3 p-5 sm:grid-cols-3">
          <div><label className="label">Site name</label><input name="name" required className="input" placeholder="BKC Tower" /></div>
          <div><label className="label">City</label><input name="city" className="input" defaultValue="Mumbai" /></div>
          <div><label className="label">Address</label><input name="address" className="input" /></div>
          <div className="sm:col-span-3"><button type="submit" className="btn-primary">Create site</button></div>
        </form>
      )}

      <div className="space-y-4">
        {sites.map((site) => (
          <div key={site.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-steel-900">{site.name}</h2>
                <p className="text-xs text-steel-500">{site.city}{site.address ? ` · ${site.address}` : ""}</p>
              </div>
              <button
                onClick={() => deactivate(site.id, site.name)}
                className="btn-danger px-3 py-1.5 text-xs shrink-0"
              >
                Deactivate
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Assign site manager</label>
                <select className="input" defaultValue="" onChange={(e) => e.target.value && assign(site.id, e.target.value)}>
                  <option value="">Select manager…</option>
                  {managers.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Assign worker</label>
                <select className="input" defaultValue="" onChange={(e) => e.target.value && assign(site.id, e.target.value)}>
                  <option value="">Select worker…</option>
                  {workers.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
        {sites.length === 0 && (
          <div className="card p-8 text-center text-sm text-steel-400">
            No job sites yet. Add one to enable assets, materials, and timesheets.
          </div>
        )}
      </div>
    </div>
  );
}
