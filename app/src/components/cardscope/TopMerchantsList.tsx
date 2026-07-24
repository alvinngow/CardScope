import { ArrowUpRight } from "lucide-react";
import { EmptyState } from "@/components/cardscope/EmptyState";
import { shortMoney } from "@/lib/formatters";
import type { MerchantSummary } from "@/lib/types";

type TopMerchantsListProps = {
  isLoading: boolean;
  merchants: MerchantSummary[];
};

export function TopMerchantsList({ isLoading, merchants }: TopMerchantsListProps) {
  return (
    <div className="rounded-lg border border-line bg-surface/90 p-5 shadow-panel max-lg:col-span-full">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase leading-none text-brand-deep dark:text-brand">
            Merchants
          </p>
          <h2 className="m-0 text-2xl font-bold leading-tight">
            Top merchants
          </h2>
        </div>
        <ArrowUpRight className="shrink-0 text-brand" size={20} />
      </div>
      <div className="grid gap-3">
        {merchants.length ? (
          merchants.map((merchant, index) => (
            <div
              className="flex min-h-10 items-center gap-3 border-b border-line pb-2 last:border-b-0 last:pb-0"
              key={merchant.merchant}
            >
              <span className="w-8 shrink-0 font-mono text-xs font-extrabold text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong className="min-w-0 flex-1 truncate">{merchant.merchant}</strong>
              <em className="shrink-0 text-right not-italic font-extrabold">
                {shortMoney.format(merchant.totalSpend)}
              </em>
            </div>
          ))
        ) : (
          <EmptyState label={isLoading ? "Loading merchants" : "No merchants yet"} />
        )}
      </div>
    </div>
  );
}
