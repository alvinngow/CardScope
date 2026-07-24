"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/cardscope/EmptyState";
import { TransactionDataTable } from "@/components/cardscope/TransactionDataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalStoragePreference } from "@/hooks/useLocalStoragePreference";
import { CATEGORY_COLORS } from "@/lib/categories";
import type { TransactionRow } from "@/lib/types";

type TransactionsPanelProps = {
  onTransactionUpdated: () => Promise<void> | void;
  transactions: TransactionRow[];
};

const ALL_CATEGORIES = "all-categories";
const LEDGER_CATEGORY_STORAGE_KEY = "cardscope-ledger-category";

export function TransactionsPanel({
  onTransactionUpdated,
  transactions,
}: TransactionsPanelProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useLocalStoragePreference({
    fallback: ALL_CATEGORIES,
    key: LEDGER_CATEGORY_STORAGE_KEY,
    parse: parseCategoryFilter,
  });
  const ledgerCategoryOptions = useMemo(
    () =>
      Array.from(new Set(transactions.map((transaction) => transaction.category)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
    [transactions],
  );
  const editableCategoryOptions = useMemo(
    () =>
      Array.from(new Set([...Object.keys(CATEGORY_COLORS), ...ledgerCategoryOptions]))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
    [ledgerCategoryOptions],
  );
  const selectedCategory = ledgerCategoryOptions.includes(categoryFilter)
    ? categoryFilter
    : ALL_CATEGORIES;
  const filteredTransactions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const categoryMatchedTransactions =
      selectedCategory === ALL_CATEGORIES
        ? transactions
        : transactions.filter((transaction) => transaction.category === selectedCategory);

    if (!needle) {
      return categoryMatchedTransactions;
    }

    return categoryMatchedTransactions.filter((transaction) =>
      [transaction.merchant, transaction.category, transaction.statementName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [query, selectedCategory, transactions]);

  return (
    <section className="mb-6 rounded-lg border border-line bg-surface/90 p-5">
      <div className="mb-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase leading-none text-brand-deep dark:text-brand">
            Ledger
          </p>
          <h2 className="m-0 text-2xl font-bold leading-tight">
            Imported transactions
          </h2>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Select value={selectedCategory} onValueChange={setCategoryFilter}>
            <SelectTrigger
              aria-label="Filter by category"
              className="h-10 w-full sm:w-52"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {ledgerCategoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </div>

      <div className="overflow-x-auto">
        {filteredTransactions.length ? (
          <TransactionDataTable
            categoryOptions={editableCategoryOptions}
            key={`${selectedCategory}:${query}:${filteredTransactions.length}`}
            onCategoryChanged={onTransactionUpdated}
            transactions={filteredTransactions}
          />
        ) : (
          <EmptyState
            label={
              query || selectedCategory !== ALL_CATEGORIES
                ? "No matching transactions"
                : "No transactions yet"
            }
          />
        )}
      </div>
    </section>
  );
}

function parseCategoryFilter(storedCategory: string | null) {
  return storedCategory && storedCategory.trim() ? storedCategory : null;
}
