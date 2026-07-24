'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  type Updater,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';
import { DataTablePagination } from '@/components/cardscope/DataTablePagination';
import { TransactionCategorySelect } from '@/components/cardscope/TransactionCategorySelect';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLocalStoragePreference } from '@/hooks/useLocalStoragePreference';
import { dateLabel, money } from '@/lib/formatters';
import { saveTransactionCategory } from '@/lib/transactionClient';
import type { TransactionRow } from '@/lib/types';

type TransactionDataTableProps = {
  categoryOptions: string[];
  ledgerTotalAmount: number;
  ledgerTotalLabel: string;
  onCategoryChanged: () => Promise<void> | void;
  transactions: TransactionRow[];
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const LEDGER_PAGE_SIZE_STORAGE_KEY = 'cardscope-ledger-page-size';

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
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<string, string>
  >({});
  const [pageIndex, setPageIndex] = useState(0);
  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize],
  );
  const handleCategoryChange = useCallback(
    async (
      transactionId: string,
      currentCategory: string,
      nextCategory: string,
    ) => {
      setCategoryOverrides((current) => ({
        ...current,
        [transactionId]: nextCategory,
      }));

      try {
        const saved = await saveTransactionCategory(
          transactionId,
          nextCategory,
        );

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
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <span className='whitespace-nowrap'>
            {dateLabel(row.original.date)}
          </span>
        ),
      },
      {
        accessorKey: 'merchant',
        header: 'Merchant',
        cell: ({ row }) => (
          <span className='block max-w-xs truncate font-bold'>
            {row.original.merchant}
          </span>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => {
          const category =
            categoryOverrides[row.original.id] ?? row.original.category;

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
        accessorKey: 'statementName',
        header: 'Statement',
        cell: ({ row }) => (
          <span className='block max-w-56 truncate text-muted'>
            {row.original.statementName}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: () => <span className='block text-right'>Amount</span>,
        cell: ({ row }) => {
          const amount = row.original.amount;
          const isCredit = amount < 0;

          return (
            <span
              className={`block whitespace-nowrap text-right font-extrabold ${
                isCredit ? 'text-positive' : ''
              }`}
            >
              {isCredit ? '-' : ''}
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
  const firstRow = totalRows
    ? pagination.pageIndex * pagination.pageSize + 1
    : 0;
  const lastRow = totalRows
    ? Math.min(totalRows, firstRow + rows.length - 1)
    : 0;
  const pageTotal = useMemo(
    () => rows.reduce((total, row) => total + row.original.amount, 0),
    [rows],
  );
  const isCreditPageTotal = pageTotal < 0;

  return (
    <div className='flex flex-col gap-4'>
      <div className='rounded-lg border border-line'>
        <Table className='min-w-full'>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='hover:bg-transparent'>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
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
          <TableFooter>
            <TableRow className='hover:bg-surface-soft'>
              <TableCell colSpan={4} className='font-extrabold text-ink'>
                Page total
              </TableCell>
              <TableCell>
                <span
                  className={`block whitespace-nowrap text-right font-extrabold ${
                    isCreditPageTotal ? 'text-positive' : ''
                  }`}
                >
                  {isCreditPageTotal ? '-' : ''}
                  {money.format(Math.abs(pageTotal))}
                </span>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <DataTablePagination
        canNextPage={table.getCanNextPage()}
        canPreviousPage={table.getCanPreviousPage()}
        firstRow={firstRow}
        lastRow={lastRow}
        onFirstPage={() => table.setPageIndex(0)}
        onLastPage={() => table.setPageIndex(Math.max(table.getPageCount() - 1, 0))}
        onNextPage={() => table.nextPage()}
        onPageSizeChange={(nextPageSize) => {
          setPageIndex(0);
          setPageSize(nextPageSize);
        }}
        onPreviousPage={() => table.previousPage()}
        pageCount={table.getPageCount()}
        pageIndex={table.getState().pagination.pageIndex}
        pageSize={pagination.pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        totalRows={totalRows}
      />
    </div>
  );

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const nextPagination =
      typeof updater === 'function' ? updater(pagination) : updater;

    setPageIndex(nextPagination.pageIndex);

    if (
      nextPagination.pageSize !== pageSize &&
      PAGE_SIZE_OPTIONS.includes(nextPagination.pageSize)
    ) {
      setPageSize(nextPagination.pageSize);
    }
  }
}

function parsePageSize(storedPageSize: string | null) {
  const parsedPageSize = Number(storedPageSize);

  return PAGE_SIZE_OPTIONS.includes(parsedPageSize) ? parsedPageSize : null;
}
