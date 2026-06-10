"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

const DEMO = [
  { label: "Platform Owner", email: "owner@constructpay.in" },
  { label: "Company Admin", email: "admin@sentinelinfra.in" },
  { label: "Site Manager", email: "foreman@sentinelinfra.in" },
  { label: "Worker", email: "worker@sentinelinfra.in" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Login failed.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Password123!");
  }

  return (
    <div className="flex min-h-screen flex-col bg-steel-50">
      <header className="border-b border-steel-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/" className="text-sm font-medium text-steel-600 hover:text-steel-900">
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8">
            <h1 className="text-2xl font-bold text-steel-900">Sign in</h1>
            <p className="mt-1 text-sm text-steel-500">
              Access your ConstructPay workspace.
            </p>

            {error && (
              <div className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <div className="card mt-4 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">
              Demo accounts · password: Password123!
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  onClick={() => fillDemo(d.email)}
                  className="btn-secondary px-2 py-2 text-xs"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
