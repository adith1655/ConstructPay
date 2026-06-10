import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConstructPay — Payroll & Workforce Data for Indian Construction",
  description:
    "Cloud-native payroll and workforce data management for India's construction industry. Multi-site time tracking, PF/ESI/PT statutory compliance, and real-time job costing in ₹.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
