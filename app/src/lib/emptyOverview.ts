import type { OverviewData } from "@/lib/types";

export function emptyOverview(setupNotice: string | null = null): OverviewData {
  return {
    categories: [],
    months: [],
    recentStatements: [],
    recentTransactions: [],
    setupNotice,
    totals: {
      avgTransaction: 0,
      monthOverMonthChange: null,
      statementCount: 0,
      totalSpend: 0,
      transactionCount: 0,
    },
    topMerchants: [],
  };
}
