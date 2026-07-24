'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DataTablePaginationProps = {
  canNextPage: boolean;
  canPreviousPage: boolean;
  firstRow: number;
  lastRow: number;
  onFirstPage: () => void;
  onLastPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
  onPreviousPage: () => void;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: number[];
  totalRows: number;
};

export function DataTablePagination({
  canNextPage,
  canPreviousPage,
  firstRow,
  lastRow,
  onFirstPage,
  onLastPage,
  onNextPage,
  onPageSizeChange,
  onPreviousPage,
  pageCount,
  pageIndex,
  pageSize,
  pageSizeOptions,
  totalRows,
}: DataTablePaginationProps) {
  return (
    <div className='flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between'>
      <div>
        Showing {firstRow}-{lastRow} of {totalRows}
      </div>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
        <div className='flex items-center gap-2'>
          <span className='whitespace-nowrap'>Rows per page</span>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className='w-20'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align='end'>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={`${option}`}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            aria-label='First page'
            disabled={!canPreviousPage}
            onClick={onFirstPage}
            size='icon'
            type='button'
            variant='outline'
          >
            <ChevronsLeft size={16} />
          </Button>
          <Button
            aria-label='Previous page'
            disabled={!canPreviousPage}
            onClick={onPreviousPage}
            size='icon'
            type='button'
            variant='outline'
          >
            <ChevronLeft size={16} />
          </Button>
          <span className='px-2 text-ink'>
            Page {pageIndex + 1} of {Math.max(pageCount, 1)}
          </span>
          <Button
            aria-label='Next page'
            disabled={!canNextPage}
            onClick={onNextPage}
            size='icon'
            type='button'
            variant='outline'
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            aria-label='Last page'
            disabled={!canNextPage}
            onClick={onLastPage}
            size='icon'
            type='button'
            variant='outline'
          >
            <ChevronsRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
