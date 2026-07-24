"use client";

import { AlertBanner } from "@/components/cardscope/AlertBanner";
import { AppHeader } from "@/components/cardscope/AppHeader";
import { ImportedStatementsPanel } from "@/components/cardscope/ImportedStatementsPanel";
import { SpendingAnalytics } from "@/components/cardscope/SpendingAnalytics";
import { StatementOverview } from "@/components/cardscope/StatementOverview";
import { TransactionsPanel } from "@/components/cardscope/TransactionsPanel";
import { useOverview } from "@/hooks/useOverview";

export function CardScopeDashboard() {
  const { error, isLoading, overview, refresh } = useOverview();

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-4 md:p-8">
      <AppHeader onRefresh={refresh} />
      <StatementOverview overview={overview} />
      {error ? <AlertBanner message={error} /> : null}
      <SpendingAnalytics isLoading={isLoading} overview={overview} />
      <ImportedStatementsPanel
        onImported={refresh}
        statements={overview?.recentStatements ?? []}
        setupNotice={overview?.setupNotice}
        onRemoved={refresh}
      />
      <TransactionsPanel transactions={overview?.transactions ?? []} />
    </main>
  );
}
