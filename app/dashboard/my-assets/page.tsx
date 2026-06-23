"use client";

import { useEffect, useState } from "react";
import { currency } from "@/lib/format";

type Asset = {
  id: string;
  assetTagId: string;
  description: string;
  cost: number;
  brand: string;
  model: string;
  serialNo: string;
  photoUrl: string | null;
  jobSite: { name: string };
  location: { name: string } | null;
};

export default function MyAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then((d) => {
        setAssets(d.assets ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-sm text-steel-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">My Assets</h1>
        <p className="mt-1 text-sm text-steel-500">Equipment and tools assigned to you (read-only).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((a) => (
          <div key={a.id} className="card p-4">
            {a.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.photoUrl} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />
            )}
            <div className="font-semibold text-steel-900">{a.assetTagId}</div>
            <div className="text-sm text-steel-600">{a.description}</div>
            <div className="mt-2 text-xs text-steel-500">
              {a.brand} {a.model} · S/N {a.serialNo}
            </div>
            <div className="mt-1 text-xs text-steel-400">
              {a.jobSite.name}{a.location ? ` · ${a.location.name}` : ""}
            </div>
            <div className="mt-2 text-sm font-medium text-steel-700">{currency(a.cost)}</div>
          </div>
        ))}
        {assets.length === 0 && (
          <div className="card col-span-full p-8 text-center text-sm text-steel-400">
            No assets assigned to you yet.
          </div>
        )}
      </div>
    </div>
  );
}
