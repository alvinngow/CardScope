export const money = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

export const shortMoney = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

export function monthLabel(value: string) {
  const date = new Date(`${value}-02T00:00:00`);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function signedPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "No prior month";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}% MoM`;
}
