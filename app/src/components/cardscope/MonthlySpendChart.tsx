import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/cardscope/EmptyState";
import { monthLabel, shortMoney } from "@/lib/formatters";
import type { MonthSummary } from "@/lib/types";

type MonthlySpendChartProps = {
  isLoading: boolean;
  months: MonthSummary[];
};

export function MonthlySpendChart({ isLoading, months }: MonthlySpendChartProps) {
  const trendMonths = [...months].reverse();
  const maxMonthSpend = Math.max(1, ...trendMonths.map((month) => month.totalSpend));

  return (
    <div className="rounded-lg border border-line bg-surface/90 p-5 shadow-panel max-lg:col-span-full">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase leading-none text-brand-deep dark:text-brand">
            Trend
          </p>
          <h2 className="m-0 text-2xl font-bold leading-tight">
            Monthly spend
          </h2>
        </div>
        <BarChart3 className="shrink-0 text-brand" size={20} />
      </div>
      <div
        className="grid min-h-64 grid-cols-3 items-end gap-3 sm:grid-cols-6"
        aria-label="Monthly spend chart"
      >
        {trendMonths.length ? (
          trendMonths.map((month) => (
            <div className="flex min-w-0 flex-col items-center gap-2 text-center" key={month.month}>
              <div className="flex h-44 w-full items-end justify-center overflow-hidden rounded-lg bg-line/60 pt-1">
                <span
                  className="block min-h-1.5 w-full rounded-t-lg bg-gradient-to-b from-coral to-brand"
                  style={{ height: `${Math.max(6, (month.totalSpend / maxMonthSpend) * 100)}%` }}
                />
              </div>
              <small className="break-words font-extrabold text-muted">
                {monthLabel(month.month).split(" ")[0]}
              </small>
              <strong className="break-words text-sm">
                {shortMoney.format(month.totalSpend)}
              </strong>
            </div>
          ))
        ) : (
          <EmptyState label={isLoading ? "Loading overview" : "No monthly data"} />
        )}
      </div>
    </div>
  );
}
