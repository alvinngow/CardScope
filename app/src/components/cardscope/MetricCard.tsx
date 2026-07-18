type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "primary";
};

export function MetricCard({ detail, label, tone = "default", value }: MetricCardProps) {
  const isPrimary = tone === "primary";

  return (
    <div
      className={`flex min-h-44 flex-col justify-between rounded-lg border p-4 shadow-panel ${
        isPrimary
          ? "border-brand-deep bg-brand-deep text-white"
          : "border-line bg-white/90 text-ink"
      }`}
    >
      <span
        className={`text-xs font-extrabold uppercase ${
          isPrimary ? "text-white/80" : "text-muted"
        }`}
      >
        {label}
      </span>
      <strong className="my-7 mb-2 block text-4xl leading-none">
        {value}
      </strong>
      <span className={isPrimary ? "text-white/80" : "text-muted"}>{detail}</span>
    </div>
  );
}
