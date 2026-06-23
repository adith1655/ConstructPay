"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ROLES, ROLE_LABELS } from "@/lib/constants";

type NavItem = { href: string; label: string; icon: string; roles: string[] };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "▦", roles: ["*"] },
  {
    href: "/dashboard/companies",
    label: "Companies",
    icon: "🏢",
    roles: [ROLES.SUPER_ADMIN],
  },
  {
    href: "/dashboard/requests",
    label: "Subscription Requests",
    icon: "✉",
    roles: [ROLES.SUPER_ADMIN],
  },
  {
    href: "/dashboard/timesheet",
    label: "My Timesheet",
    icon: "⏱",
    roles: [ROLES.SITE_MANAGER, ROLES.WORKER],
  },
  {
    href: "/dashboard/approvals",
    label: "Approvals",
    icon: "✔",
    roles: [ROLES.ADMIN, ROLES.SITE_MANAGER],
  },
  {
    href: "/dashboard/job-costing",
    label: "Job Costing",
    icon: "₹",
    roles: [ROLES.ADMIN, ROLES.SITE_MANAGER],
  },
  {
    href: "/dashboard/budget",
    label: "Budget Audit",
    icon: "📊",
    roles: [ROLES.ADMIN, ROLES.SITE_MANAGER],
  },
  {
    href: "/dashboard/inventory",
    label: "Materials",
    icon: "📦",
    roles: [ROLES.ADMIN, ROLES.SITE_MANAGER],
  },
  {
    href: "/dashboard/assets",
    label: "Assets",
    icon: "🔧",
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SITE_MANAGER],
  },
  {
    href: "/dashboard/expenses",
    label: "Expenses",
    icon: "🧾",
    roles: [ROLES.ADMIN, ROLES.SITE_MANAGER],
  },
  {
    href: "/dashboard/sites",
    label: "Job Sites",
    icon: "📍",
    roles: [ROLES.ADMIN],
  },
  {
    href: "/dashboard/my-assets",
    label: "My Assets",
    icon: "🔩",
    roles: [ROLES.WORKER],
  },
  {
    href: "/dashboard/site-managers",
    label: "Site Managers",
    icon: "👷",
    roles: [ROLES.ADMIN],
  },
  {
    href: "/dashboard/workers",
    label: "Crew / Workers",
    icon: "◍",
    roles: [ROLES.SITE_MANAGER],
  },
  {
    href: "/dashboard/users",
    label: "Team & Roles",
    icon: "◎",
    roles: [ROLES.ADMIN],
  },
  {
    href: "/dashboard/pay",
    label: "Pay & Documents",
    icon: "🧾",
    roles: [ROLES.SITE_MANAGER, ROLES.WORKER],
  },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();

  const visible = NAV.filter(
    (item) => item.roles.includes("*") || item.roles.includes(role)
  );

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-steel-200 bg-white">
      <div className="border-b border-steel-200 px-5 py-4">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {visible.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-steel-600 hover:bg-steel-100 hover:text-steel-900"
              }`}
            >
              <span className="w-4 text-center text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-steel-200 px-5 py-3 text-xs text-steel-400">
        {ROLE_LABELS[role] ?? role}
      </div>
    </aside>
  );
}
