import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { categorizeMerchant, categoryColor, isManagedCategory } from "@/lib/categories";
import type { ParsedStatement } from "@/lib/statementParser";
import type {
  CategorySummary,
  MerchantSummary,
  MonthSummary,
  OverviewData,
  StatementRow,
  TransactionRow,
} from "@/lib/types";

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX ?? 8),
      ssl:
        process.env.PGSSL === "true" || process.env.DATABASE_URL.includes("sslmode=require")
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  return pool;
}

export async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = getPool()
      .query(SCHEMA_SQL)
      .then(() => recategorizeManagedTransactions())
      .then(() => undefined)
      .catch((error) => {
        schemaPromise = null;
        throw error;
      });
  }

  await schemaPromise;
}

export async function overviewFromDatabase(): Promise<OverviewData> {
  await ensureSchema();

  const [
    totalsResult,
    monthsResult,
    categoriesResult,
    merchantsResult,
    transactionsResult,
    statementsResult,
  ] = await Promise.all([
    query<{
      avg_transaction: number | null;
      statement_count: number;
      total_spend: number;
      transaction_count: number;
    }>(`
      SELECT
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::float8 AS total_spend,
        COUNT(*)::int AS transaction_count,
        COUNT(DISTINCT statement_id)::int AS statement_count,
        AVG(CASE WHEN amount > 0 THEN amount END)::float8 AS avg_transaction
      FROM transactions
    `),
    query<{
      month: string;
      total_spend: number;
      transaction_count: number;
    }>(`
      SELECT
        to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::float8 AS total_spend,
        COUNT(*)::int AS transaction_count
      FROM transactions
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 12
    `),
    query<{
      category: string;
      total_spend: number;
      transaction_count: number;
    }>(`
      SELECT
        category,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::float8 AS total_spend,
        COUNT(*)::int AS transaction_count
      FROM transactions
      WHERE amount > 0
      GROUP BY category
      ORDER BY total_spend DESC
      LIMIT 8
    `),
    query<{
      merchant: string;
      total_spend: number;
      transaction_count: number;
    }>(`
      SELECT
        merchant,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::float8 AS total_spend,
        COUNT(*)::int AS transaction_count
      FROM transactions
      WHERE amount > 0
      GROUP BY merchant
      ORDER BY total_spend DESC
      LIMIT 6
    `),
    query<{
      amount: number;
      category: string;
      date: string;
      id: string;
      merchant: string;
      statement_name: string;
    }>(`
      SELECT
        transactions.id::text,
        to_char(transactions.transaction_date, 'YYYY-MM-DD') AS date,
        transactions.merchant,
        transactions.category,
        transactions.amount::float8 AS amount,
        statements.file_name AS statement_name
      FROM transactions
      JOIN statements ON statements.id = transactions.statement_id
      ORDER BY transactions.transaction_date DESC, transactions.id DESC
    `),
    query<{
      file_name: string;
      id: string;
      issuer: string;
      statement_month: string;
      total_spend: number;
      transaction_count: number;
      uploaded_at: string;
    }>(`
      SELECT
        id::text,
        file_name,
        issuer,
        to_char(statement_month, 'YYYY-MM') AS statement_month,
        total_spend::float8,
        transaction_count::int,
        uploaded_at::text
      FROM statements
      ORDER BY uploaded_at DESC
      LIMIT 10
    `),
  ]);

  const months = monthsResult.map<MonthSummary>((month) => ({
    month: month.month,
    totalSpend: roundMoney(month.total_spend),
    transactionCount: month.transaction_count,
  }));
  const totalSpend = totalsResult[0]?.total_spend ?? 0;
  const latest = months[0]?.totalSpend ?? 0;
  const prior = months[1]?.totalSpend ?? 0;

  return {
    categories: withCategoryShares(categoriesResult),
    months,
    recentStatements: statementsResult.map<StatementRow>((statement) => ({
      fileName: statement.file_name,
      id: statement.id,
      issuer: statement.issuer,
      statementMonth: statement.statement_month,
      totalSpend: roundMoney(statement.total_spend),
      transactionCount: statement.transaction_count,
      uploadedAt: statement.uploaded_at,
    })),
    transactions: transactionsResult.map<TransactionRow>((transaction) => ({
      amount: roundMoney(transaction.amount),
      category: transaction.category,
      date: transaction.date,
      id: transaction.id,
      merchant: transaction.merchant,
      statementName: transaction.statement_name,
    })),
    setupNotice: null,
    totals: {
      avgTransaction: roundMoney(totalsResult[0]?.avg_transaction ?? 0),
      monthOverMonthChange: prior > 0 ? ((latest - prior) / prior) * 100 : null,
      statementCount: totalsResult[0]?.statement_count ?? 0,
      totalSpend: roundMoney(totalSpend),
      transactionCount: totalsResult[0]?.transaction_count ?? 0,
    },
    topMerchants: merchantsResult.map<MerchantSummary>((merchant) => ({
      merchant: merchant.merchant,
      totalSpend: roundMoney(merchant.total_spend),
      transactionCount: merchant.transaction_count,
    })),
  };
}

export async function saveStatement(fileName: string, parsed: ParsedStatement) {
  await ensureSchema();

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const statementMonthDate = `${parsed.statementMonth}-01`;

    await client.query(
      `
        DELETE FROM statements
        WHERE file_name = $1
          AND statement_month = $2::date
      `,
      [fileName, statementMonthDate],
    );

    const statement = await client.query<{ id: number }>(
      `
        INSERT INTO statements (
          file_name,
          issuer,
          parse_mode,
          statement_month,
          total_spend,
          transaction_count,
          warnings
        )
        VALUES ($1, $2, $3, $4::date, $5, $6, $7::jsonb)
        RETURNING id
      `,
      [
        fileName,
        parsed.issuer,
        parsed.parseMode,
        statementMonthDate,
        roundMoney(totalPositiveSpend(parsed)),
        parsed.transactions.length,
        JSON.stringify(parsed.warnings),
      ],
    );
    const statementId = statement.rows[0].id;

    for (const transaction of parsed.transactions) {
      await client.query(
        `
          INSERT INTO transactions (
            statement_id,
            transaction_date,
            merchant,
            category,
            category_source,
            amount,
            raw_text
          )
          VALUES ($1, $2::date, $3, $4, $5, $6, $7)
        `,
        [
          statementId,
          transaction.transactionDate,
          transaction.merchant,
          transaction.category,
          transaction.categorySource,
          transaction.amount,
          transaction.rawText,
        ],
      );
    }

    await client.query("COMMIT");

    return {
      id: String(statementId),
      issuer: parsed.issuer,
      statementMonth: parsed.statementMonth,
      transactionCount: parsed.transactions.length,
      warningCount: parsed.warnings.length,
    };
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

async function query<T extends QueryResultRow>(sql: string, params: unknown[] = []) {
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

async function rollback(client: PoolClient) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Keep the original database error as the useful failure.
  }
}

async function recategorizeManagedTransactions() {
  const result = await getPool().query<{
    amount: number;
    category: string;
    category_source: string;
    id: string;
    merchant: string;
    raw_text: string | null;
  }>(`
    SELECT
      id::text,
      merchant,
      category,
      category_source,
      amount::float8 AS amount,
      raw_text
    FROM transactions
  `);
  const updates = [];

  for (const transaction of result.rows) {
    if (transaction.category_source !== "rules" || !isManagedCategory(transaction.category)) {
      continue;
    }

    const category = categorizeMerchant(
      `${transaction.merchant} ${transaction.raw_text ?? ""}`,
      transaction.amount,
    );

    if (category === transaction.category) {
      continue;
    }

    updates.push(
      getPool().query("UPDATE transactions SET category = $1 WHERE id = $2", [
        category,
        transaction.id,
      ]),
    );
  }

  await Promise.all(updates);
}

function withCategoryShares(
  rows: Array<{ category: string; total_spend: number; transaction_count: number }>,
): CategorySummary[] {
  const totalSpend = rows.reduce((total, row) => total + row.total_spend, 0);

  return rows.map((row) => ({
    category: row.category,
    color: categoryColor(row.category),
    share: totalSpend ? (row.total_spend / totalSpend) * 100 : 0,
    totalSpend: roundMoney(row.total_spend),
    transactionCount: row.transaction_count,
  }));
}

function totalPositiveSpend(parsed: ParsedStatement) {
  return parsed.transactions.reduce((total, transaction) => {
    return transaction.amount > 0 ? total + transaction.amount : total;
  }, 0);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS statements (
  id BIGSERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  issuer TEXT NOT NULL DEFAULT 'Credit card',
  parse_mode TEXT NOT NULL DEFAULT 'csv',
  statement_month DATE NOT NULL,
  total_spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  statement_id BIGINT NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  category_source TEXT NOT NULL DEFAULT 'rules',
  amount NUMERIC(12, 2) NOT NULL,
  raw_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS category_source TEXT NOT NULL DEFAULT 'rules';

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant);
CREATE INDEX IF NOT EXISTS idx_statements_month ON statements(statement_month DESC);
`;
