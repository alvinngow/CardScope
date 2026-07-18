import { CreditCard, RefreshCw } from "lucide-react";

type AppHeaderProps = {
  onRefresh: () => void;
};

export function AppHeader({ onRefresh }: AppHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-white" aria-hidden="true">
          <CreditCard size={22} />
        </div>
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase leading-none text-brand-deep">
            CardScope
          </p>
          <h1 className="m-0 text-2xl font-bold leading-tight">
            Monthly statement overview
          </h1>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2.5 sm:justify-start">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink transition hover:border-brand hover:shadow-lg"
          type="button"
          onClick={onRefresh}
          aria-label="Refresh overview"
        >
          <RefreshCw size={18} />
        </button>
      </div>
    </header>
  );
}
