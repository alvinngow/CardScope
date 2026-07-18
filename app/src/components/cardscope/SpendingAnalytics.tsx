import { CategorySpendList } from "@/components/cardscope/CategorySpendList";
import { MonthlySpendChart } from "@/components/cardscope/MonthlySpendChart";
import { TopMerchantsList } from "@/components/cardscope/TopMerchantsList";
import type { OverviewData } from "@/lib/types";

type SpendingAnalyticsProps = {
  isLoading: boolean;
  overview: OverviewData | null;
};

export function SpendingAnalytics({ isLoading, overview }: SpendingAnalyticsProps) {
  return (
    <section className="mb-4 grid gap-4 lg:grid-cols-3">
      <MonthlySpendChart isLoading={isLoading} months={overview?.months ?? []} />
      <CategorySpendList categories={overview?.categories ?? []} isLoading={isLoading} />
      <TopMerchantsList isLoading={isLoading} merchants={overview?.topMerchants ?? []} />
    </section>
  );
}
