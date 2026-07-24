"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/cardscope/EmptyState";
import { TransactionDataTable } from "@/components/cardscope/TransactionDataTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalStoragePreference } from "@/hooks/useLocalStoragePreference";
import { CATEGORY_COLORS } from "@/lib/categories";
import { money } from "@/lib/formatters";
import type { TransactionRow } from "@/lib/types";

type TransactionsPanelProps = {
  onTransactionUpdated: () => Promise<void> | void;
  transactions: TransactionRow[];
};

const ALL_CATEGORIES = "all-categories";
const LEDGER_CATEGORY_STORAGE_KEY = "cardscope-ledger-category";
const LEDGER_DATE_FROM_STORAGE_KEY = "cardscope-ledger-date-from";
const LEDGER_DATE_TO_STORAGE_KEY = "cardscope-ledger-date-to";

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
  const [dateFrom, setDateFrom] = useLocalStoragePreference({
    fallback: "",
    key: LEDGER_DATE_FROM_STORAGE_KEY,
    parse: parseDateFilter,
  });
  const [dateTo, setDateTo] = useLocalStoragePreference({
    fallback: "",
    key: LEDGER_DATE_TO_STORAGE_KEY,
    parse: parseDateFilter,
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
  const dateMatchedTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const isAfterStart = !dateFrom || transaction.date >= dateFrom;
        const isBeforeEnd = !dateTo || transaction.date <= dateTo;

        return isAfterStart && isBeforeEnd;
      }),
    [dateFrom, dateTo, transactions],
  );
  const categoryTotalTransactions = useMemo(
    () =>
      selectedCategory === ALL_CATEGORIES
        ? dateMatchedTransactions
        : dateMatchedTransactions.filter((transaction) => transaction.category === selectedCategory),
    [dateMatchedTransactions, selectedCategory],
  );
  const categoryTotal = useMemo(
    () =>
      categoryTotalTransactions.reduce(
        (total, transaction) => total + transaction.amount,
        0,
      ),
    [categoryTotalTransactions],
  );
  const ledgerTotalLabel =
    selectedCategory === ALL_CATEGORIES ? "Filtered total" : `${selectedCategory} total`;
  const filteredTransactions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const categoryMatchedTransactions =
      selectedCategory === ALL_CATEGORIES
        ? dateMatchedTransactions
        : dateMatchedTransactions.filter((transaction) => transaction.category === selectedCategory);

    if (!needle) {
      return categoryMatchedTransactions;
    }

    return categoryMatchedTransactions.filter((transaction) =>
      [transaction.merchant, transaction.category, transaction.statementName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [dateMatchedTransactions, query, selectedCategory]);
  const hasDateFilter = Boolean(dateFrom || dateTo);
  const hasAnyFilter = Boolean(
    query || selectedCategory !== ALL_CATEGORIES || hasDateFilter,
  );

  return (
    <section className="mb-6 rounded-lg border border-line bg-surface/90 p-5">
      <div className="mb-4 flex flex-col items-stretch gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase leading-none text-brand-deep dark:text-brand">
            Ledger
          </p>
          <h2 className="m-0 text-2xl font-bold leading-tight">
            Imported transactions
          </h2>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-muted focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 sm:w-40">
              <span className="font-bold">From</span>
              <input
                aria-label="Filter from date"
                className="h-full min-w-0 flex-1 border-0 bg-surface p-0 text-ink outline-none"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </label>
            <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-muted focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 sm:w-40">
              <span className="font-bold">To</span>
              <input
                aria-label="Filter to date"
                className="h-full min-w-0 flex-1 border-0 bg-surface p-0 text-ink outline-none"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </label>
            {hasDateFilter ? (
              <Button
                aria-label="Clear date range"
                className="h-10 w-full sm:w-10"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                size="icon"
                type="button"
                variant="outline"
              >
                <X size={16} />
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
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
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-soft px-3 py-2 text-sm">
            <span className="font-bold text-muted">{ledgerTotalLabel}</span>
            <span
              className={`font-extrabold text-ink ${
                categoryTotal < 0 ? "text-positive" : ""
              }`}
            >
              {categoryTotal < 0 ? "-" : ""}
              {money.format(Math.abs(categoryTotal))}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {filteredTransactions.length ? (
          <TransactionDataTable
            categoryOptions={editableCategoryOptions}
            key={`${selectedCategory}:${dateFrom}:${dateTo}:${query}:${filteredTransactions.length}`}
            ledgerTotalAmount={categoryTotal}
            ledgerTotalLabel={ledgerTotalLabel}
            onCategoryChanged={onTransactionUpdated}
            transactions={filteredTransactions}
          />
        ) : (
          <EmptyState
            label={
              hasAnyFilter ? "No matching transactions" : "No transactions yet"
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

function parseDateFilter(storedDate: string | null) {
  return storedDate && /^\d{4}-\d{2}-\d{2}$/.test(storedDate) ? storedDate : null;
}
