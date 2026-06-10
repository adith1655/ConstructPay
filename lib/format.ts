// All formatting uses the en-IN locale so numbers group in the Indian system
// (thousand, lakh, crore — e.g. ₹1,23,45,678).

export function currency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function number(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

// Compact Indian-style figure for large values (e.g. ₹4.5 Cr, ₹12 L).
export function currencyCompact(n: number) {
  if (n >= 1_00_00_000) {
    return `₹${number(Math.round((n / 1_00_00_000) * 100) / 100)} Cr`;
  }
  if (n >= 1_00_000) {
    return `₹${number(Math.round((n / 1_00_000) * 10) / 10)} L`;
  }
  return currency(n);
}

export function hours(n: number) {
  return `${number(n)} hrs`;
}

export function dateShort(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function timeShort(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}
