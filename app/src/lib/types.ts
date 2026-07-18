export type Totals = {
  avgTransaction: number;
  monthOverMonthChange: number | null;
  statementCount: number;
  totalSpend: number;
  transactionCount: number;
};

export type MonthSummary = {
  month: string;
  totalSpend: number;
  transactionCount: number;
};

export type CategorySummary = {
  category: string;
  color: string;
  share: number;
  totalSpend: number;
  transactionCount: number;
};

export type MerchantSummary = {
  merchant: string;
  totalSpend: number;
  transactionCount: number;
};

export type TransactionRow = {
  amount: number;
  category: string;
  date: string;
  id: string;
  merchant: string;
  statementName: string;
};

export type StatementRow = {
  fileName: string;
  id: string;
  issuer: string;
  statementMonth: string;
  totalSpend: number;
  transactionCount: number;
  uploadedAt: string;
};

export type OverviewData = {
  categories: CategorySummary[];
  months: MonthSummary[];
  recentStatements: StatementRow[];
  recentTransactions: TransactionRow[];
  setupNotice: string | null;
  totals: Totals;
  topMerchants: MerchantSummary[];
};
