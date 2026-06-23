"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLE_LABELS } from "@/lib/constants";

type PlatformUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
  company: { name: string } | null;
};

export default function PasswordResetPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resetPassword(userId: string, email: string) {
    const password = passwords[userId];
    if (!password || password.length < 8) {
      setError("Enter a new password of at least 8 characters.");
      return;
    }
    setError(null);
    setMessage(null);
    setBusyId(userId);
    const res = await fetch(`/api/platform/users/${userId}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not reset password.");
    } else {
      setMessage(`Password updated for ${email}.`);
      setPasswords((p) => ({ ...p, [userId]: "" }));
    }
    setBusyId(null);
  }

  if (loading) return <div className="text-sm text-steel-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Password Reset</h1>
        <p className="mt-1 text-sm text-steel-500">
          Set a new password for any subscriber user (company admins, site managers, workers).
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-steel-50 text-left text-xs uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">New password</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-steel-900">{u.fullName}</div>
                  <div className="text-xs text-steel-500">{u.email}</div>
                </td>
                <td className="px-4 py-3 text-steel-600">{u.company?.name ?? "—"}</td>
                <td className="px-4 py-3 text-steel-600">{ROLE_LABELS[u.role] ?? u.role}</td>
                <td className="px-4 py-3">
                  <input
                    type="password"
                    className="input min-w-[12rem]"
                    placeholder="min 8 characters"
                    value={passwords[u.id] ?? ""}
                    onChange={(e) => setPasswords((p) => ({ ...p, [u.id]: e.target.value }))}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => resetPassword(u.id, u.email)}
                    disabled={busyId === u.id || !u.active}
                    className="btn-primary text-xs"
                  >
                    {busyId === u.id ? "Saving…" : "Reset"}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-steel-400">
                  No subscriber users yet. Approve a subscription request first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
