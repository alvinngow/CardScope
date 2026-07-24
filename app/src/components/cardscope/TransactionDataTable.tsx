"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  type Updater,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { TransactionCategorySelect } from "@/components/cardscope/TransactionCategorySelect";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocalStoragePreference } from "@/hooks/useLocalStoragePreference";
import { dateLabel, money } from "@/lib/formatters";
import { saveTransactionCategory } from "@/lib/transactionClient";
import type { TransactionRow } from "@/lib/types";

type TransactionDataTableProps = {
  categoryOptions: string[];
  onCategoryChanged: () => Promise<void> | void;
  transactions: TransactionRow[];
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const LEDGER_PAGE_SIZE_STORAGE_KEY = "cardscope-ledger-page-size";

export function TransactionDataTable({
  categoryOptions,
  onCategoryChanged,
  transactions,
}: TransactionDataTableProps) {
  const [pageSize, setPageSize] = useLocalStoragePreference({
    fallback: PAGE_SIZE_OPTIONS[0],
    key: LEDGER_PAGE_SIZE_STORAGE_KEY,
    parse: parsePageSize,
  });
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize],
  );
  const handleCategoryChange = useCallback(
    async (transactionId: string, currentCategory: string, nextCategory: string) => {
      setCategoryOverrides((current) => ({
        ...current,
        [transactionId]: nextCategory,
      }));

      try {
        const saved = await saveTransactionCategory(transactionId, nextCategory);

        setCategoryOverrides((current) => ({
          ...current,
          [transactionId]: saved.category,
        }));
        await onCategoryChanged();
      } catch (error) {
        setCategoryOverrides((current) => ({
          ...current,
          [transactionId]: currentCategory,
        }));
        throw error;
      }
    },
    [onCategoryChanged],
  );

  const columns = useMemo<ColumnDef<TransactionRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{dateLabel(row.original.date)}</span>
        ),
      },
      {
        accessorKey: "merchant",
        header: "Merchant",
        cell: ({ row }) => (
          <span className="block max-w-xs truncate font-bold">{row.original.merchant}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => {
          const category = categoryOverrides[row.original.id] ?? row.original.category;

          return (
            <TransactionCategorySelect
              category={category}
              categoryOptions={categoryOptions}
              merchant={row.original.merchant}
              onChange={(nextCategory) =>
                handleCategoryChange(row.original.id, category, nextCategory)
              }
            />
          );
        },
      },
      {
        accessorKey: "statementName",
        header: "Statement",
        cell: ({ row }) => (
          <span className="block max-w-56 truncate text-muted">{row.original.statementName}</span>
        ),
      },
      {
        accessorKey: "amount",
        header: () => <span className="block text-right">Amount</span>,
        cell: ({ row }) => {
          const amount = row.original.amount;
          const isCredit = amount < 0;

          return (
            <span
              className={`block whitespace-nowrap text-right font-extrabold ${
                isCredit ? "text-positive" : ""
              }`}
            >
              {isCredit ? "-" : ""}
              {money.format(Math.abs(amount))}
            </span>
          );
        },
      },
    ],
    [categoryOptions, categoryOverrides, handleCategoryChange],
  );
  // TanStack Table intentionally returns live table helpers; this follows shadcn's data-table pattern.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data: transactions,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: handlePaginationChange,
    state: {
      pagination,
    },
  });
  const rows = table.getRowModel().rows;
  const totalRows = table.getPrePaginationRowModel().rows.length;
  const firstRow = totalRows ? pagination.pageIndex * pagination.pageSize + 1 : 0;
  const lastRow = totalRows ? Math.min(totalRows, firstRow + rows.length - 1) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-line">
        <Table className="min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing {firstRow}-{lastRow} of {totalRows}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">Rows per page</span>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(value) => {
                setPageIndex(0);
                setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {PAGE_SIZE_OPTIONS.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              aria-label="First page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronsLeft size={16} />
            </Button>
            <Button
              aria-label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="px-2 text-ink">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronRight size={16} />
            </Button>
            <Button
              aria-label="Last page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronsRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const nextPagination = typeof updater === "function" ? updater(pagination) : updater;

    setPageIndex(nextPagination.pageIndex);

    if (nextPagination.pageSize !== pageSize && PAGE_SIZE_OPTIONS.includes(nextPagination.pageSize)) {
      setPageSize(nextPagination.pageSize);
    }
  }
}

function parsePageSize(storedPageSize: string | null) {
  const parsedPageSize = Number(storedPageSize);

  return PAGE_SIZE_OPTIONS.includes(parsedPageSize) ? parsedPageSize : null;
}
