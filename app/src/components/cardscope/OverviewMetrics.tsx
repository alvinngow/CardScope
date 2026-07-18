import { MetricCard } from "@/components/cardscope/MetricCard";
import { money, monthLabel, shortMoney, signedPercent } from "@/lib/formatters";
import type { OverviewData } from "@/lib/types";

type OverviewMetricsProps = {
  overview: OverviewData | null;
};

export function OverviewMetrics({ overview }: OverviewMetricsProps) {
  const latestMonth = overview?.months[0];

  return (
    <>
      <MetricCard
        detail={latestMonth ? monthLabel(latestMonth.month) : "No statements yet"}
        label="Latest month"
        tone="primary"
        value={latestMonth ? shortMoney.format(latestMonth.totalSpend) : shortMoney.format(0)}
      />
      <MetricCard
        detail={`${overview?.totals.transactionCount ?? 0} transactions`}
        label="Total spend"
        value={overview ? shortMoney.format(overview.totals.totalSpend) : shortMoney.format(0)}
      />
      <MetricCard
        detail={signedPercent(overview?.totals.monthOverMonthChange ?? null)}
        label="Average charge"
        value={overview ? money.format(overview.totals.avgTransaction) : money.format(0)}
      />
    </>
  );
}
