"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TransactionCategorySelectProps = {
  category: string;
  categoryOptions: string[];
  merchant: string;
  onChange: (category: string) => Promise<void>;
};

export function TransactionCategorySelect({
  category,
  categoryOptions,
  merchant,
  onChange,
}: TransactionCategorySelectProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const options = categoryOptions.includes(category)
    ? categoryOptions
    : [...categoryOptions, category].sort((left, right) => left.localeCompare(right));

  async function handleChange(nextCategory: string) {
    if (nextCategory === category || isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onChange(nextCategory);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The category could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select disabled={isSaving} value={category} onValueChange={handleChange}>
        <SelectTrigger
          aria-label={`Category for ${merchant}`}
          className="h-9 w-40"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isSaving ? (
        <Loader2 aria-label="Saving category" className="animate-spin text-muted" size={16} />
      ) : null}
      {error ? (
        <span className="text-coral" title={error}>
          <CircleAlert aria-label={error} size={16} />
        </span>
      ) : null}
    </div>
  );
}
