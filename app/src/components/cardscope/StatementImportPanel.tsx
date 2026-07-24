"use client";

import { Database, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { StatementMonthPicker } from "@/components/cardscope/StatementMonthPicker";
import { monthLabel } from "@/lib/formatters";

type StatementImportPanelProps = {
  onComplete?: (message: string) => void;
  onImported: () => Promise<void>;
  setupNotice: string | null | undefined;
};

type StatementImportResponse = {
  error?: string;
  issuer?: string;
  statementMonth?: string;
  transactionCount?: number;
  warningCount?: number;
};

const STATEMENT_MONTH_STORAGE_KEY = "cardscope-statement-month";

export function StatementImportPanel({
  onComplete,
  onImported,
  setupNotice,
}: StatementImportPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [statementMonth, setStatementMonth] = useState(initialStatementMonth);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateStatementMonth(value: string) {
    setStatementMonth(value);
    localStorage.setItem(STATEMENT_MONTH_STORAGE_KEY, value);
  }

  async function uploadFile(file: File) {
    setIsUploading(true);
    setNotice(null);

    const formData = new FormData();
    formData.append("statement", file);
    formData.append("statementMonth", statementMonth);

    try {
      const response = await fetch("/api/statements", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as StatementImportResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "The statement could not be imported.");
      }

      const message = `Imported ${payload.transactionCount ?? 0} transactions for ${
        payload.statementMonth ? monthLabel(payload.statementMonth) : "the selected month"
      }.`;

      setNotice(message);
      await onImported();
      onComplete?.(message);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "The statement could not be imported.");
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];

    if (file) {
      void uploadFile(file);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      onSubmit={(event) => event.preventDefault()}
    >
      <label className="-mb-2 text-xs font-extrabold text-muted" htmlFor="statement-month">
        Statement month
      </label>
      <StatementMonthPicker
        disabled={isUploading}
        value={statementMonth}
        onChange={updateStatementMonth}
      />

      <button
        className={`flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 font-extrabold text-brand-deep transition hover:border-brand hover:shadow-lg dark:text-brand ${
          isDragging ? "border-brand bg-brand/10 ring-2 ring-brand/20" : "border-muted/40 bg-brand/5"
        }`}
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud size={30} />
        <span>{isUploading ? "Importing..." : "Choose statement"}</span>
        <span className="text-sm font-medium text-muted">CSV, PDF, or plain text</span>
      </button>
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".csv,.txt,.tsv,.pdf,text/csv,text/plain,application/pdf"
        onChange={(event) => handleFiles(event.target.files)}
      />

      {notice ? (
        <p className="m-0 flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm leading-relaxed text-muted">
          {notice}
        </p>
      ) : null}
      {setupNotice ? (
        <p className="m-0 flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm leading-relaxed text-muted">
          <Database size={16} />
          {setupNotice}
        </p>
      ) : null}
    </form>
  );
}

function initialStatementMonth() {
  if (typeof localStorage === "undefined") {
    return currentMonth();
  }

  const storedMonth = localStorage.getItem(STATEMENT_MONTH_STORAGE_KEY);

  return storedMonth && /^\d{4}-\d{2}$/.test(storedMonth) ? storedMonth : currentMonth();
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
