"use client";

import { useEffect, useState } from "react";
import { currency } from "@/lib/format";

type Expense = {
  id: string;
  description: string;
  amount: number;
  vendor: string | null;
  purchaseDate: string | null;
  createdAt: string;
  jobSite: { name: string } | null;
  createdBy: { fullName: string };
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => r.json())
      .then((d) => setExpenses(d.expenses ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-steel-900">Expenses</h1>
        <p className="mt-1 text-sm text-steel-500">
          Consumables and non-asset bill line items (from bill scan or manual entry).
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-steel-50 text-left text-xs uppercase text-steel-500">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Logged by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100">
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3">{e.description}</td>
                <td className="px-4 py-3 text-steel-500">{e.jobSite?.name ?? "—"}</td>
                <td className="px-4 py-3 text-steel-500">{e.vendor ?? "—"}</td>
                <td className="px-4 py-3 font-medium">{currency(e.amount)}</td>
                <td className="px-4 py-3 text-xs text-steel-400">{e.createdBy.fullName}</td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-steel-400">No expenses logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
