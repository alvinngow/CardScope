import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/cardscope/EmptyState";
import { shortMoney } from "@/lib/formatters";
import type { CategorySummary } from "@/lib/types";

type CategorySpendListProps = {
  categories: CategorySummary[];
  isLoading: boolean;
};

export function CategorySpendList({ categories, isLoading }: CategorySpendListProps) {
  return (
    <div className="rounded-lg border border-line bg-white/90 p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase leading-none text-brand-deep">
            Categories
          </p>
          <h2 className="m-0 text-2xl font-bold leading-tight">
            Spend mix
          </h2>
        </div>
        <ShieldCheck className="shrink-0 text-brand" size={20} />
      </div>
      <div className="grid gap-3">
        {categories.length ? (
          categories.map((category) => (
            <div
              className="flex items-center gap-3"
              key={category.category}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 font-extrabold">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                <span className="truncate">{category.category}</span>
              </div>
              <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-line/60 sm:block" aria-hidden="true">
                <span
                  className="block h-full rounded-full"
                  style={{
                    backgroundColor: category.color,
                    width: `${Math.max(4, category.share)}%`,
                  }}
                />
              </div>
              <strong className="w-24 shrink-0 text-right text-sm">{shortMoney.format(category.totalSpend)}</strong>
            </div>
          ))
        ) : (
          <EmptyState label={isLoading ? "Loading categories" : "No categories yet"} />
        )}
      </div>
    </div>
  );
}
