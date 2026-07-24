import { OverviewMetrics } from "@/components/cardscope/OverviewMetrics";
import type { OverviewData } from "@/lib/types";

type StatementOverviewProps = {
  overview: OverviewData | null;
};

export function StatementOverview({ overview }: StatementOverviewProps) {
  return (
    <section
      className="mb-4"
      aria-label="Statement spending overview"
    >
      <OverviewMetrics overview={overview} />
    </section>
  );
}
