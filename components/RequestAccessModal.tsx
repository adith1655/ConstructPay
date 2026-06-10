"use client";

import { useState } from "react";

export function RequestAccessModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Submission failed. Please try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-steel-950/60 p-4"
      onMouseDown={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              ✓
            </div>
            <h3 className="text-lg font-bold text-steel-900">Request received</h3>
            <p className="mt-2 text-sm text-steel-600">
              Thanks — a Super Admin will review your request and email you with
              next steps. Accounts are provisioned manually to protect payroll
              data.
            </p>
            <button onClick={onClose} className="btn-primary mt-6">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-steel-900">
                  Request Platform Access
                </h3>
                <p className="mt-1 text-sm text-steel-500">
                  No account is created automatically. A Super Admin reviews and
                  provisions every account.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-steel-400 hover:bg-steel-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Full Name *</label>
                <input name="fullName" required className="input" />
              </div>
              <div>
                <label className="label">Business Name *</label>
                <input name="businessName" required className="input" />
              </div>
              <div>
                <label className="label">Your Role *</label>
                <select name="roleRequested" required className="input" defaultValue="ADMIN">
                  <option value="ADMIN">Owner / Payroll Director</option>
                  <option value="ADMIN">Finance / HR Head</option>
                </select>
              </div>
              <div>
                <label className="label">Business Email *</label>
                <input name="email" type="email" required className="input" />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input name="phone" className="input" placeholder="+91" />
              </div>
              <div>
                <label className="label">City</label>
                <select name="city" className="input" defaultValue="">
                  <option value="">Select…</option>
                  <option>Mumbai</option>
                  <option>New Delhi</option>
                  <option>Bengaluru</option>
                  <option>Pune</option>
                  <option>Hyderabad</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Number of Employees</label>
                <select name="employees" className="input" defaultValue="">
                  <option value="">Select…</option>
                  <option>1-10</option>
                  <option>11-25</option>
                  <option>25-50</option>
                  <option>51-100</option>
                  <option>100+</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Brief Description of Use Case</label>
                <textarea name="useCase" rows={3} className="input resize-none" />
              </div>
              <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
