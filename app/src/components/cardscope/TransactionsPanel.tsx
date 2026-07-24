"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/cardscope/EmptyState";
import { TransactionDataTable } from "@/components/cardscope/TransactionDataTable";
import type { TransactionRow } from "@/lib/types";

type TransactionsPanelProps = {
  transactions: TransactionRow[];
};

export function TransactionsPanel({ transactions }: TransactionsPanelProps) {
  const [query, setQuery] = useState("");
  const filteredTransactions = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return transactions;
    }

    return transactions.filter((transaction) =>
      [transaction.merchant, transaction.category, transaction.statementName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [query, transactions]);

  return (
    <section className="mb-6 rounded-lg border border-line bg-white/90 p-5">
      <div className="mb-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase leading-none text-brand-deep">
            Ledger
          </p>
          <h2 className="m-0 text-2xl font-bold leading-tight">
            Imported transactions
          </h2>
        </div>
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 text-muted focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 sm:w-72">
          <Search size={18} />
          <input
            className="h-full min-w-0 flex-1 border-0 bg-surface p-0 text-ink outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search transactions"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        {filteredTransactions.length ? (
          <TransactionDataTable transactions={filteredTransactions} />
        ) : (
          <EmptyState label={query ? "No matching transactions" : "No transactions yet"} />
        )}
      </div>
    </section>
  );
}
