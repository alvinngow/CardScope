"use client";

import { Database, FileText, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { StatementMonthPicker } from "@/components/cardscope/StatementMonthPicker";
import { monthLabel } from "@/lib/formatters";

type StatementImportPanelProps = {
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

export function StatementImportPanel({ onImported, setupNotice }: StatementImportPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [statementMonth, setStatementMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      setNotice(
        `Imported ${payload.transactionCount ?? 0} transactions for ${
          payload.statementMonth ? monthLabel(payload.statementMonth) : "the selected month"
        }.`,
      );
      await onImported();
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
      className={`flex flex-col gap-4 rounded-lg border bg-white/90 p-4 shadow-panel ${
        isDragging ? "border-brand ring-2 ring-brand/20" : "border-line"
      }`}
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
    >
      <div className="flex items-center justify-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-white" aria-hidden="true">
          <UploadCloud size={20} />
        </div>
        <div>
          <h2 className="m-0 text-2xl font-bold leading-tight">
            Import statement
          </h2>
          <p className="mt-1 text-sm text-muted">CSV, PDF, or plain text</p>
        </div>
      </div>

      <label className="-mb-2 text-xs font-extrabold text-muted" htmlFor="statement-month">
        Statement month
      </label>
      <StatementMonthPicker
        disabled={isUploading}
        value={statementMonth}
        onChange={setStatementMonth}
      />

      <button
        className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted/40 bg-brand/5 p-4 font-extrabold text-brand-deep transition hover:border-brand hover:shadow-lg"
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <FileText size={28} />
        <span>{isUploading ? "Importing..." : "Choose statement"}</span>
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
