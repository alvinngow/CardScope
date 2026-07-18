import { categorizeMerchant } from "@/lib/categories";

export type ParsedTransaction = {
  amount: number;
  category: string;
  merchant: string;
  rawText: string;
  transactionDate: string;
};

export type ParsedStatement = {
  issuer: string;
  parseMode: "csv" | "pdf" | "text";
  statementMonth: string;
  transactions: ParsedTransaction[];
  warnings: string[];
};

type HeaderMap = {
  amount: number;
  category: number;
  credit: number;
  date: number;
  debit: number;
  merchant: number;
};

const MAX_TRANSACTION_ROWS = 2500;

export async function parseStatementFile(
  fileName: string,
  contentType: string,
  buffer: Buffer,
  fallbackMonth?: string,
): Promise<ParsedStatement> {
  const lowerName = fileName.toLowerCase();
  const isPdf = contentType.includes("pdf") || lowerName.endsWith(".pdf");
  const parseMode = isPdf ? "pdf" : looksLikeCsvName(lowerName) ? "csv" : "text";
  const text = isPdf ? await extractPdfText(buffer) : buffer.toString("utf8");
  const rows =
    parseMode === "csv"
      ? parseCsvTransactions(text)
      : parseLooseTextTransactions(text, fallbackMonth);
  const transactions = rows
    .filter((row) => Number.isFinite(row.amount) && row.merchant && row.transactionDate)
    .slice(0, MAX_TRANSACTION_ROWS);
  const warnings: string[] = [];

  if (rows.length > MAX_TRANSACTION_ROWS) {
    warnings.push(`Only the first ${MAX_TRANSACTION_ROWS} transaction rows were imported.`);
  }

  if (!transactions.length) {
    warnings.push("No transaction rows were recognized.");
  }

  return {
    issuer: detectIssuer(text, fileName),
    parseMode,
    statementMonth: inferStatementMonth(transactions, fallbackMonth),
    transactions,
    warnings,
  };
}

async function extractPdfText(buffer: Buffer) {
  try {
    const pdfParseModule = (await import("pdf-parse")) as {
      default?: (input: Buffer) => Promise<{ text?: string }>;
    };
    const parse = pdfParseModule.default;

    if (!parse) {
      throw new Error("PDF parser is unavailable.");
    }

    const result = await parse(buffer);
    return result.text ?? "";
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown PDF parsing error.";
    throw new Error(`Could not read text from this PDF. ${detail}`);
  }
}

function looksLikeCsvName(fileName: string) {
  return fileName.endsWith(".csv") || fileName.endsWith(".tsv");
}

function parseCsvTransactions(text: string): ParsedTransaction[] {
  const delimiter = detectDelimiter(text);
  const records = parseDelimited(text, delimiter).filter((row) =>
    row.some((cell) => cell.trim().length > 0),
  );

  if (records.length < 2) {
    return [];
  }

  const headerIndex = records.findIndex((row) => mapHeaders(row).date >= 0);

  if (headerIndex < 0) {
    return [];
  }

  const headers = mapHeaders(records[headerIndex]);
  const transactions: ParsedTransaction[] = [];

  for (const row of records.slice(headerIndex + 1)) {
    const date = parseDate(row[headers.date]);
    const merchant = cleanMerchant(row[headers.merchant] ?? "");
    const amount = amountFromRow(row, headers);

    if (!date || !merchant || amount === null || amount === 0) {
      continue;
    }

    const category =
      headers.category >= 0 && row[headers.category]?.trim()
        ? titleCase(row[headers.category])
        : categorizeMerchant(merchant, amount);

    transactions.push({
      amount,
      category,
      merchant,
      rawText: row.join(" | "),
      transactionDate: date,
    });
  }

  return transactions;
}

function parseLooseTextTransactions(text: string, fallbackMonth?: string): ParsedTransaction[] {
  const inferredYear = fallbackMonth ? Number(fallbackMonth.slice(0, 4)) : new Date().getFullYear();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const amountMatch = line.match(/(?:^|\s)([-(]?\$?\d[\d,]*(?:\.\d{2})\)?)(?:\s*(cr|credit))?\s*$/i);

    if (!amountMatch) {
      continue;
    }

    const dateMatch = line.match(
      /(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})/,
    );

    if (!dateMatch) {
      continue;
    }

    const date = parseDate(dateMatch[1], inferredYear);
    const amount = parseMoney(amountMatch[1], amountMatch[2]);

    if (!date || amount === null || amount === 0) {
      continue;
    }

    const merchant = cleanMerchant(
      line
        .replace(dateMatch[0], "")
        .replace(amountMatch[0], "")
        .replace(/\b(posted|transaction|purchase|date)\b/gi, "")
        .trim(),
    );

    if (!merchant || merchant.length < 3) {
      continue;
    }

    transactions.push({
      amount,
      category: categorizeMerchant(merchant, amount),
      merchant,
      rawText: line,
      transactionDate: date,
    });
  }

  return transactions;
}

function detectDelimiter(text: string) {
  const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
  const candidates = [",", "\t", ";"];

  return candidates.reduce((best, candidate) => {
    const candidateCount = countOccurrences(sample, candidate);
    const bestCount = countOccurrences(sample, best);
    return candidateCount > bestCount ? candidate : best;
  }, ",");
}

function parseDelimited(text: string, delimiter: string) {
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(field.trim());
      records.push(row);
      field = "";
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  records.push(row);

  return records;
}

function mapHeaders(row: string[]): HeaderMap {
  const normalized = row.map((cell) => cell.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());

  return {
    amount: findIndex(normalized, ["amount", "transaction amount", "charge", "charges"]),
    category: findIndex(normalized, ["category", "type", "classification"]),
    credit: findIndex(normalized, ["credit", "credits", "payment", "payments"]),
    date: findIndex(normalized, [
      "date",
      "transaction date",
      "posting date",
      "posted date",
      "purchase date",
    ]),
    debit: findIndex(normalized, ["debit", "debits", "withdrawal", "withdrawals"]),
    merchant: findIndex(normalized, [
      "description",
      "merchant",
      "merchant name",
      "name",
      "payee",
      "transaction",
      "transaction description",
    ]),
  };
}

function findIndex(values: string[], candidates: string[]) {
  return values.findIndex((value) => candidates.includes(value));
}

function amountFromRow(row: string[], headers: HeaderMap) {
  if (headers.debit >= 0 || headers.credit >= 0) {
    const debit = headers.debit >= 0 ? parseMoney(row[headers.debit]) : null;
    const credit = headers.credit >= 0 ? parseMoney(row[headers.credit]) : null;

    if (debit !== null && debit !== 0) {
      return Math.abs(debit);
    }

    if (credit !== null && credit !== 0) {
      return -Math.abs(credit);
    }
  }

  if (headers.amount >= 0) {
    return parseMoney(row[headers.amount]);
  }

  return null;
}

function parseMoney(value?: string, suffix?: string) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const isCredit = /\b(cr|credit)\b/i.test(`${trimmed} ${suffix ?? ""}`);
  const isNegative = trimmed.includes("-") || /^\(.*\)$/.test(trimmed) || isCredit;
  const normalized = trimmed.replace(/[^0-9.]/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Number((isNegative ? -parsed : parsed).toFixed(2));
}

function parseDate(value?: string, fallbackYear = new Date().getFullYear()) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const numeric = trimmed.match(/^(\d{1,4})[./-](\d{1,2})(?:[./-](\d{1,4}))?$/);

  if (numeric) {
    const parts = numeric.slice(1).map((part) => (part === undefined ? undefined : Number(part)));
    let year: number;
    let month: number;
    let day: number;

    if (String(parts[0]).length === 4) {
      year = parts[0] as number;
      month = parts[1] as number;
      day = parts[2] as number;
    } else {
      const first = parts[0] as number;
      const second = parts[1] as number;
      const third = parts[2];
      year = third === undefined ? fallbackYear : normalizeYear(third as number);

      if (first > 12) {
        day = first;
        month = second;
      } else {
        month = first;
        day = second;
      }
    }

    return validDate(year, month, day);
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toIsoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

function normalizeYear(year: number) {
  if (year < 100) {
    return year + 2000;
  }

  return year;
}

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return toIsoDate(year, month, day);
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function cleanMerchant(value: string) {
  return titleCase(
    value
      .replace(/\s{2,}/g, " ")
      .replace(/\b\d{4,}\b/g, "")
      .replace(/\b(auth|card|purchase|pos|sale)\b/gi, "")
      .trim(),
  );
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^(llc|usa|us|uk|sg|atm)$/i.test(word)) {
        return word.toUpperCase();
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function inferStatementMonth(transactions: ParsedTransaction[], fallbackMonth?: string) {
  const counts = new Map<string, number>();

  for (const transaction of transactions) {
    const month = transaction.transactionDate.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  const inferred = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return inferred ?? fallbackMonth ?? new Date().toISOString().slice(0, 7);
}

function detectIssuer(text: string, fileName: string) {
  const haystack = `${fileName}\n${text.slice(0, 4000)}`.toLowerCase();
  const issuers = [
    ["american express", "American Express"],
    ["amex", "American Express"],
    ["bank of america", "Bank of America"],
    ["capital one", "Capital One"],
    ["chase", "Chase"],
    ["citi", "Citi"],
    ["discover", "Discover"],
    ["wells fargo", "Wells Fargo"],
  ] as const;
  const match = issuers.find(([needle]) => haystack.includes(needle));

  return match?.[1] ?? "Credit card";
}

function countOccurrences(value: string, needle: string) {
  return value.split(needle).length - 1;
}
