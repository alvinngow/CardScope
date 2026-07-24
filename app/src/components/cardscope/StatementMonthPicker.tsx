"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { monthLabel } from "@/lib/formatters";

type StatementMonthPickerProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
};

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

export function StatementMonthPicker({ disabled, onChange, value }: StatementMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedMonth = useMemo(() => parseMonthValue(value), [value]);
  const [viewYear, setViewYear] = useState(selectedMonth.getFullYear());

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setViewYear(parseMonthValue(value).getFullYear());
    }

    setOpen(nextOpen);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          className="h-10 w-full justify-start bg-surface px-3 text-left font-normal"
          disabled={disabled}
          id="statement-month"
          type="button"
          variant="outline"
        >
          <CalendarDays size={18} />
          <span className="flex-1">{monthLabel(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4">
        <div className="mb-3 flex items-center justify-between">
          <Button
            aria-label="Previous year"
            onClick={() => setViewYear((year) => year - 1)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronLeft size={18} />
          </Button>
          <div className="text-base font-extrabold">{viewYear}</div>
          <Button
            aria-label="Next year"
            onClick={() => setViewYear((year) => year + 1)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const monthValue = `${viewYear}-${String(monthIndex + 1).padStart(2, "0")}`;
            const isSelected = monthValue === value;

            return (
              <Button
                aria-pressed={isSelected}
                className="justify-center"
                key={monthValue}
                onClick={() => {
                  onChange(monthValue);
                  setOpen(false);
                }}
                type="button"
                variant={isSelected ? "default" : "outline"}
              >
                {monthFormatter.format(new Date(viewYear, monthIndex, 1))}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function parseMonthValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return new Date();
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}
