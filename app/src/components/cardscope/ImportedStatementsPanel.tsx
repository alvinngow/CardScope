"use client";

import { FileText, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/cardscope/EmptyState";
import { StatementImportPanel } from "@/components/cardscope/StatementImportPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { money, monthLabel } from "@/lib/formatters";
import type { StatementRow } from "@/lib/types";

type ImportedStatementsPanelProps = {
  onImported: () => Promise<void>;
  onRemoved: () => Promise<void>;
  setupNotice: string | null | undefined;
  statements: StatementRow[];
};

export function ImportedStatementsPanel({
  onImported,
  onRemoved,
  setupNotice,
  statements,
}: ImportedStatementsPanelProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function removeStatement(statement: StatementRow) {
    const confirmed = window.confirm(
      `Remove ${statement.fileName}? This will also remove its imported transactions.`,
    );

    if (!confirmed) {
      return;
    }

    setRemovingId(statement.id);
    setNotice(null);

    try {
      const response = await fetch(`/api/statements/${statement.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "The statement could not be removed.");
      }

      setNotice(`Removed ${statement.fileName}.`);
      await onRemoved();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The statement could not be removed.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-line bg-surface/90 p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase leading-none text-brand-deep dark:text-brand">
            Statements
          </p>
          <h2 className="m-0 text-2xl font-bold leading-tight">Imported statements</h2>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button type="button">
                <UploadCloud size={16} />
                Upload statement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload statement</DialogTitle>
                <DialogDescription>
                  Choose the statement month, then drop or select your statement file.
                </DialogDescription>
              </DialogHeader>
              <StatementImportPanel
                onImported={onImported}
                setupNotice={setupNotice}
                onComplete={(message) => {
                  setNotice(message);
                  setIsUploadOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
          <div className="text-sm text-muted">
            {statements.length} {statements.length === 1 ? "statement" : "statements"}
          </div>
        </div>
      </div>

      {statements.length ? (
        <div className="rounded-lg border border-line">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Statement</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((statement) => (
                <TableRow key={statement.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="shrink-0 text-brand" size={18} />
                      <div className="min-w-0">
                        <div className="truncate font-bold">{statement.fileName}</div>
                        <div className="text-xs text-muted">{statement.issuer}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {monthLabel(statement.statementMonth)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-bold">
                    {money.format(statement.totalSpend)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {statement.transactionCount}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted">
                    {uploadedLabel(statement.uploadedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      aria-label={`Remove ${statement.fileName}`}
                      disabled={removingId !== null}
                      onClick={() => void removeStatement(statement)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 size={16} />
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState label="No statements imported" />
      )}

      {notice ? (
        <p className="mt-4 rounded-lg bg-surface-soft px-3 py-2 text-sm leading-relaxed text-muted">
          {notice}
        </p>
      ) : null}
    </section>
  );
}

function uploadedLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
}
