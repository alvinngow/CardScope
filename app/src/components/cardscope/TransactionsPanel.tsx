"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/cardscope/EmptyState";
import { dateLabel, money } from "@/lib/formatters";
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
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="text-xs font-extrabold uppercase text-muted">
                <th className="w-28 pb-3 font-inherit">Date</th>
                <th className="pb-3 font-inherit">Merchant</th>
                <th className="w-40 pb-3 font-inherit">Category</th>
                <th className="w-32 pb-3 text-right font-inherit">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <TransactionLine key={transaction.id} transaction={transaction} />
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState label={query ? "No matching transactions" : "No transactions yet"} />
        )}
      </div>
    </section>
  );
}

function TransactionLine({ transaction }: { transaction: TransactionRow }) {
  const isCredit = transaction.amount < 0;

  return (
    <tr className="border-t border-line">
      <td className="w-28 whitespace-nowrap py-3 pr-4">{dateLabel(transaction.date)}</td>
      <td className="min-w-48 max-w-xs truncate py-3 pr-4 font-bold">{transaction.merchant}</td>
      <td className="w-40 whitespace-nowrap py-3 pr-4 text-muted">{transaction.category}</td>
      <td className={`w-32 whitespace-nowrap py-3 text-right font-extrabold ${isCredit ? "text-positive" : ""}`}>
        {isCredit ? "-" : ""}
        {money.format(Math.abs(transaction.amount))}
      </td>
    </tr>
  );
}
