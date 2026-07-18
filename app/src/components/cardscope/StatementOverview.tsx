import { OverviewMetrics } from "@/components/cardscope/OverviewMetrics";
import { StatementImportPanel } from "@/components/cardscope/StatementImportPanel";
import type { OverviewData } from "@/lib/types";

type StatementOverviewProps = {
  onImported: () => Promise<void>;
  overview: OverviewData | null;
};

export function StatementOverview({ onImported, overview }: StatementOverviewProps) {
  return (
    <section
      className="mb-4 grid gap-4 lg:grid-cols-4"
      aria-label="Statement import and spending overview"
    >
      <StatementImportPanel onImported={onImported} setupNotice={overview?.setupNotice} />
      <OverviewMetrics overview={overview} />
    </section>
  );
}
