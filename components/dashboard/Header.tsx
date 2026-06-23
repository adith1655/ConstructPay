"use client";

import { useRouter } from "next/navigation";
import { ROLE_LABELS } from "@/lib/constants";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header({
  fullName,
  role,
  companyName,
}: {
  fullName: string;
  role: string;
  companyName?: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-steel-200 bg-white px-6 dark:border-steel-700 dark:bg-steel-900">
      <div className="flex items-center gap-3">
        <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400">
          {ROLE_LABELS[role] ?? role}
        </span>
        {companyName && (
          <span className="hidden text-sm font-medium text-steel-500 sm:inline">
            {companyName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-steel-800 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-steel-900">{fullName}</div>
          </div>
        </div>
        <button onClick={logout} className="btn-secondary px-3 py-2 text-xs">
          Sign out
        </button>
      </div>
    </header>
  );
}
