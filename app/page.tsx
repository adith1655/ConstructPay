"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RequestAccessModal } from "@/components/RequestAccessModal";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES = [
  {
    icon: "⏱️",
    title: "Multi-Site Time Tracking",
    desc: "GPS-verified mobile clock-in, cost-code tagging, and bulk crew muster across every site in Mumbai, Delhi & beyond.",
  },
  {
    icon: "📋",
    title: "Statutory Payroll (PF / ESI / PT)",
    desc: "Auto-calculate Provident Fund, ESI, Professional Tax and TDS from logged hours, and generate Form 16 / 16A.",
  },
  {
    icon: "📊",
    title: "Real-Time Job Costing (₹)",
    desc: "Budget vs. actual labour cost by cost code, project, and portfolio in lakhs & crores — the moment a timesheet is approved.",
  },
  {
    icon: "📱",
    title: "Mobile-First Field Access",
    desc: "Offline-capable PWA built for the monsoon, heat and patchy network on site. Daily site reports, weather and equipment logs.",
  },
  {
    icon: "🧾",
    title: "On-Roll & Contract Labour",
    desc: "Manage PF/ESI employees and contract labour (TDS) from one record. Block payments until PAN & GSTIN are on file.",
  },
  {
    icon: "🔒",
    title: "Compliance & RBAC",
    desc: "Minimum Wages Act & CLRA-ready, granular role-based access, encryption in transit & at rest, and a full audit trail.",
  },
];

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-steel-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-steel-200 bg-white/90 backdrop-blur dark:border-steel-700 dark:bg-steel-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-steel-600 dark:text-steel-400 md:flex">
            <a href="#about" className="hover:text-steel-900 dark:hover:text-steel-100">
              About Us
            </a>
            <a href="#features" className="hover:text-steel-900 dark:hover:text-steel-100">
              Features We Offer
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="btn-secondary">
              Sign In
            </Link>
            <button onClick={() => setModalOpen(true)} className="btn-primary">
              Request Access
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-steel-900 text-white">
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center">
          <span className="badge bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/40">
            Built for the construction industry
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Payroll & workforce data,{" "}
            <span className="text-brand-500">finally built for the field.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-steel-300">
            ConstructPay replaces paper muster rolls, scattered spreadsheets,
            and manual PF/ESI compliance with one unified, role-aware,
            mobile-first platform — built for India&apos;s metro construction firms.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => setModalOpen(true)} className="btn-primary px-6 py-3 text-base">
              Request Access
            </button>
            <a href="#features" className="btn-secondary border-steel-600 bg-transparent px-6 py-3 text-base text-white hover:bg-white/10">
              Explore Features
            </a>
          </div>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-6 text-center">
            {[
              ["80%", "Less time on statutory filings"],
              ["99.5%", "Payroll calculation accuracy"],
              ["≤2 taps", "To clock in from the field"],
            ].map(([stat, label]) => (
              <div key={label}>
                <div className="text-3xl font-bold text-brand-500">{stat}</div>
                <div className="mt-1 text-sm text-steel-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-steel-900">
            Features We Offer
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-steel-600">
            Everything a construction business needs to track labor, stay
            compliant, and protect margin — in one place.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-2xl dark:bg-brand-900/50">
                {f.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-steel-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-600">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-y border-steel-200 bg-steel-50 dark:border-steel-700 dark:bg-steel-900">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-steel-900">
              About ConstructPay
            </h2>
            <p className="mt-4 text-steel-600">
              Indian construction firms operate under regulatory, contractual, and
              operational constraints that general-purpose payroll tools simply
              weren&apos;t built for: Minimum Wages Act rates, PF/ESI &amp; PT
              compliance, multi-site crews, and mixed on-roll &amp; contract labour.
            </p>
            <p className="mt-4 text-steel-600">
              We built ConstructPay from the ground up for metros like Mumbai and
              Delhi — combining statutory compliance automation, real-time job
              costing in rupees, and a field-ready mobile experience your crews
              will actually use.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-steel-700">
              {[
                "Minimum Wages Act, EPF, ESI & CLRA ready",
                "AES-256 encryption with full audit trail",
                "Real-time labour cost visibility in ₹ at every level",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-brand-600">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-steel-500">
              Why account creation is request-only
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-steel-600">
              Because ConstructPay handles sensitive payroll, PF/ESI and PAN data,
              self-service sign-up is intentionally disabled. Every company is
              reviewed and onboarded by the ConstructPay team — so you always know
              exactly who has access to your workforce data.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary mt-6 w-full"
            >
              Request Access
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-steel-900 text-steel-400">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <Logo textClassName="text-white" />
            <nav className="flex flex-wrap gap-6 text-sm">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Security</a>
              <a href="#" className="hover:text-white">Contact Us</a>
            </nav>
          </div>
          <div className="mt-8 border-t border-steel-800 pt-6 text-xs text-steel-500">
            © {new Date().getFullYear()} ConstructPay. All rights reserved.
            Confidential — MVP demonstration build.
          </div>
        </div>
      </footer>

      <RequestAccessModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
