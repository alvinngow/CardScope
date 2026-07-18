import { AlertCircle } from "lucide-react";

export function AlertBanner({ message }: { message: string }) {
  return (
    <section
      className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      role="alert"
    >
      <AlertCircle size={18} />
      <span>{message}</span>
    </section>
  );
}
