import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "ConstructPay — Payroll & Workforce Data for Indian Construction",
  description:
    "Cloud-native payroll and workforce data management for India's construction industry. Multi-site time tracking, PF/ESI/PT statutory compliance, and real-time job costing in ₹.",
};

const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem("constructpay-theme");
    var dark =
      t === "dark" ||
      (t !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
