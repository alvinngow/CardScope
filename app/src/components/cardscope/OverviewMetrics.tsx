import { money, monthLabel, shortMoney, signedPercent } from "@/lib/formatters";
import type { OverviewData } from "@/lib/types";

type OverviewMetricsProps = {
  overview: OverviewData | null;
};

export function OverviewMetrics({ overview }: OverviewMetricsProps) {
  const latestMonth = overview?.months[0];
  const transactionCount = overview?.totals.transactionCount ?? 0;
  const metrics = [
    {
      detail: latestMonth ? monthLabel(latestMonth.month) : "No statements yet",
      label: "Latest month",
      value: latestMonth ? shortMoney.format(latestMonth.totalSpend) : shortMoney.format(0),
    },
    {
      detail: `${transactionCount} ${transactionCount === 1 ? "transaction" : "transactions"}`,
      label: "Total spend",
      value: overview ? shortMoney.format(overview.totals.totalSpend) : shortMoney.format(0),
    },
    {
      detail: signedPercent(overview?.totals.monthOverMonthChange ?? null),
      label: "Average charge",
      value: overview ? money.format(overview.totals.avgTransaction) : money.format(0),
    },
  ];

  return (
    <div className="flex min-h-44 flex-col justify-between rounded-lg border border-brand-deep bg-brand-deep p-4 text-white shadow-panel">
      <div>
        <p className="m-0 text-xs font-extrabold uppercase text-white/80">Overview</p>
        <h2 className="m-0 mt-2 text-2xl font-bold leading-tight">Statement snapshot</h2>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {metrics.map((metric) => (
          <div className="min-w-0" key={metric.label}>
            <span className="text-xs font-extrabold uppercase text-white/70">{metric.label}</span>
            <strong className="mt-3 block truncate text-3xl leading-none">{metric.value}</strong>
            <span className="mt-2 block truncate text-sm text-white/75">{metric.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
