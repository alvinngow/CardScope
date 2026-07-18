export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-line bg-surface-soft p-4 text-center text-muted">
      {label}
    </div>
  );
}
