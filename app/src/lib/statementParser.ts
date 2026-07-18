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

type ParsedRows = {
  transactions: ParsedTransaction[];
  warnings: string[];
};

type PdfTextItem = {
  str: string;
  transform: ArrayLike<number>;
};

type PdfTextContent = {
  items: PdfTextItem[];
};

type PdfPage = {
  getTextContent(): Promise<PdfTextContent>;
};

type PdfDocument = {
  getPage(pageNumber: number): Promise<PdfPage>;
  numPages: number;
};

type PdfJsModule = {
  getDocument(input: Uint8Array): {
    promise: Promise<PdfDocument>;
  };
};

type PositionedText = {
  text: string;
  x: number;
  y: number;
};

type PositionedTextRow = {
  items: PositionedText[];
  y: number;
};

const MAX_TRANSACTION_ROWS = 2500;
const STANDARD_CHARTERED_ROW_Y_TOLERANCE = 2.75;
const MONTHS: Record<string, number> = {
  apr: 4,
  aug: 8,
  dec: 12,
  feb: 2,
  jan: 1,
  jul: 7,
  jun: 6,
  mar: 3,
  may: 5,
  nov: 11,
  oct: 10,
  sep: 9,
};

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
  const statementMonth = fallbackMonth ?? extractStatementMonth(text);
  const parsedRows = await parseRows(parseMode, text, buffer, statementMonth);
  const transactions = parsedRows.transactions
    .filter((row) => Number.isFinite(row.amount) && row.merchant && row.transactionDate)
    .slice(0, MAX_TRANSACTION_ROWS);
  const warnings: string[] = [...parsedRows.warnings];

  if (parsedRows.transactions.length > MAX_TRANSACTION_ROWS) {
    warnings.push(`Only the first ${MAX_TRANSACTION_ROWS} transaction rows were imported.`);
  }

  if (!transactions.length) {
    warnings.push("No transaction rows were recognized.");
  }

  return {
    issuer: detectIssuer(text, fileName),
    parseMode,
    statementMonth: inferStatementMonth(transactions, statementMonth),
    transactions,
    warnings,
  };
}

async function parseRows(
  parseMode: ParsedStatement["parseMode"],
  text: string,
  buffer: Buffer,
  statementMonth?: string,
): Promise<ParsedRows> {
  if (parseMode === "csv") {
    return { transactions: parseCsvTransactions(text), warnings: [] };
  }

  if (parseMode === "pdf" && isStandardCharteredStatement(text)) {
    const positionedRows = await parseStandardCharteredPdfTransactions(buffer, statementMonth);

    if (positionedRows.transactions.length) {
      return positionedRows;
    }

    const textRows = parseTextTransactions(text, statementMonth);

    return {
      transactions: textRows.transactions,
      warnings: [...positionedRows.warnings, ...textRows.warnings],
    };
  }

  return parseTextTransactions(text, statementMonth);
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

async function loadPdfJs() {
  const pdfJsModule = (await import("pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js")) as {
    default?: PdfJsModule;
    getDocument?: PdfJsModule["getDocument"];
  };
  const pdfJs = pdfJsModule.default ?? pdfJsModule;

  if (typeof pdfJs.getDocument !== "function") {
    throw new Error("PDF row parser is unavailable.");
  }

  return pdfJs as PdfJsModule;
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

function parseTextTransactions(
  text: string,
  fallbackMonth?: string,
): { transactions: ParsedTransaction[]; warnings: string[] } {
  if (isStandardCharteredStatement(text)) {
    const parsed = parseStandardCharteredTransactions(text, fallbackMonth);

    if (parsed.transactions.length) {
      return parsed;
    }
  }

  return {
    transactions: parseLooseTextTransactions(text, fallbackMonth),
    warnings: [],
  };
}

async function parseStandardCharteredPdfTransactions(
  buffer: Buffer,
  fallbackMonth?: string,
): Promise<ParsedRows> {
  const statementMonth = fallbackMonth ?? new Date().toISOString().slice(0, 7);

  try {
    const pdfJs = await loadPdfJs();
    const document = await pdfJs.getDocument(new Uint8Array(buffer)).promise;
    const transactions: ParsedTransaction[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const rows = groupPositionedTextRows(textContent.items);

      for (const row of rows) {
        const transaction = parseStandardCharteredPositionedRow(row, statementMonth);

        if (transaction) {
          transactions.push(transaction);
        }
      }
    }

    return {
      transactions,
      warnings: [],
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown PDF row parsing error.";

    return {
      transactions: [],
      warnings: [`Standard Chartered PDF rows could not be read visually. ${detail}`],
    };
  }
}

function groupPositionedTextRows(items: PdfTextItem[]) {
  const positionedItems = items
    .map((item) => {
      const text = item.str.replace(/\s+/g, " ").trim();

      if (!text || item.transform.length < 6) {
        return null;
      }

      return {
        text,
        x: item.transform[4],
        y: item.transform[5],
      };
    })
    .filter((item): item is PositionedText => item !== null)
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PositionedTextRow[] = [];

  for (const item of positionedItems) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= STANDARD_CHARTERED_ROW_Y_TOLERANCE);

    if (row) {
      row.items.push(item);
      row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
      continue;
    }

    rows.push({ items: [item], y: item.y });
  }

  return rows.map((row) => ({
    ...row,
    items: row.items.sort((a, b) => a.x - b.x),
  }));
}

function parseStandardCharteredPositionedRow(
  row: PositionedTextRow,
  fallbackMonth: string,
): ParsedTransaction | null {
  const dateItem = row.items.find((item) => item.x >= 35 && item.x <= 80 && /^\d{2}\s+[A-Za-z]{3}$/i.test(item.text));
  const amountText = row.items
    .filter((item) => item.x >= 480)
    .map((item) => item.text)
    .join("")
    .replace(/\s+/g, "");
  const amountMatch = amountText.match(/^(\d[\d,]*\.\d{2})(CR)?$/i);

  if (!dateItem || !amountMatch) {
    return null;
  }

  const dateMatch = dateItem.text.match(/^(\d{2})\s+([A-Za-z]{3})$/i);
  const transactionDate = dateMatch ? parseDayMonthDate(dateMatch[1], dateMatch[2], fallbackMonth) : null;
  const amount = parseMoney(amountMatch[1], amountMatch[2]);
  const merchant = cleanMerchant(
    row.items
      .filter((item) => item.x >= 125 && item.x < 350)
      .map((item) => item.text)
      .join(" "),
  );

  if (!transactionDate || amount === null || !merchant || merchant.length < 3) {
    return null;
  }

  const rawText = row.items.map((item) => item.text).join(" | ");

  return {
    amount,
    category: categorizeMerchant(merchant, amount),
    merchant,
    rawText,
    transactionDate,
  };
}

function parseStandardCharteredTransactions(
  text: string,
  fallbackMonth?: string,
): ParsedRows {
  const statementMonth = fallbackMonth ?? extractStatementMonth(text) ?? new Date().toISOString().slice(0, 7);
  const lines = normalizeTextLines(text);
  const pages = splitStandardCharteredPages(lines);
  const warnings: string[] = [];
  const transactions: ParsedTransaction[] = [];

  for (const pageLines of pages) {
    const tableIndex = pageLines.findIndex(
      (line, index) => line === "Transaction" && pageLines[index + 1] === "Date",
    );

    if (tableIndex < 0) {
      continue;
    }

    const descriptions = collectStandardCharteredDescriptions(pageLines.slice(0, tableIndex));
    const rows = pageLines
      .slice(tableIndex + 1)
      .map((line) => parseStandardCharteredAmountRow(line, statementMonth))
      .filter((row): row is { amount: number; rawText: string; transactionDate: string } => row !== null);
    const pairCount = Math.min(descriptions.length, rows.length);

    if (descriptions.length !== rows.length) {
      warnings.push("A Standard Chartered page had unmatched descriptions and amount rows.");
    }

    for (let index = 0; index < pairCount; index += 1) {
      const merchant = cleanMerchant(descriptions[index]);
      const row = rows[index];

      if (!merchant) {
        continue;
      }

      transactions.push({
        amount: row.amount,
        category: categorizeMerchant(merchant, row.amount),
        merchant,
        rawText: `${row.rawText} | ${descriptions[index]}`,
        transactionDate: row.transactionDate,
      });
    }
  }

  return {
    transactions,
    warnings: [...new Set(warnings)],
  };
}

function parseLooseTextTransactions(text: string, fallbackMonth?: string): ParsedTransaction[] {
  const inferredYear = fallbackMonth ? Number(fallbackMonth.slice(0, 4)) : new Date().getFullYear();
  const lines = normalizeTextLines(text);
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

function normalizeTextLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isStandardCharteredStatement(text: string) {
  return /standard chartered/i.test(text);
}

function splitStandardCharteredPages(lines: string[]) {
  const pages: string[][] = [];
  let currentPage: string[] = [];

  for (const line of lines) {
    if (/^Page of \d+/i.test(line) && currentPage.length) {
      pages.push(currentPage);
      currentPage = [];
    }

    currentPage.push(line);
  }

  if (currentPage.length) {
    pages.push(currentPage);
  }

  return pages;
}

function collectStandardCharteredDescriptions(lines: string[]) {
  const descriptions: string[] = [];
  let shouldReadRefDescription = false;
  let isAccountSummarySection = false;

  for (const line of lines) {
    if (/^Transaction Ref\b/i.test(line)) {
      shouldReadRefDescription = true;
      isAccountSummarySection = false;
      continue;
    }

    if (isStandardCharteredAccountSummaryLine(line)) {
      shouldReadRefDescription = false;
      isAccountSummarySection = true;
      continue;
    }

    if (shouldReadRefDescription) {
      if (!isStandardCharteredIgnoredDescriptionLine(line)) {
        descriptions.push(line);
      }

      shouldReadRefDescription = false;
      continue;
    }

    if (!isAccountSummarySection && isStandardCharteredStandaloneDescription(line)) {
      descriptions.push(line);
    }
  }

  return descriptions;
}

function parseStandardCharteredAmountRow(line: string, fallbackMonth: string) {
  const match = line.match(/^(\d{2})\s+([A-Za-z]{3})\s*(\d{2})\s+([A-Za-z]{3})(\d[\d,]*\.\d{2})(CR)?$/i);

  if (!match) {
    return null;
  }

  const transactionDate = parseDayMonthDate(match[1], match[2], fallbackMonth);
  const amount = parseMoney(match[5], match[6]);

  if (!transactionDate || amount === null) {
    return null;
  }

  return {
    amount,
    rawText: line,
    transactionDate,
  };
}

function parseDayMonthDate(day: string, monthName: string, fallbackMonth: string) {
  const fallbackYear = Number(fallbackMonth.slice(0, 4));
  const fallbackMonthNumber = Number(fallbackMonth.slice(5, 7));
  const month = MONTHS[monthName.slice(0, 3).toLowerCase()];

  if (!month) {
    return null;
  }

  const year = month > fallbackMonthNumber ? fallbackYear - 1 : fallbackYear;
  return validDate(year, month, Number(day));
}

function isStandardCharteredAccountSummaryLine(line: string) {
  return (
    /\bcredit card and personal loan statement\b/i.test(line) ||
    /\bsimply cash credit card\b/i.test(line) ||
    /^account\/card no\b/i.test(line) ||
    /^approved credit limit\b/i.test(line) ||
    /^available credit limit\b/i.test(line) ||
    /^important information\b/i.test(line) ||
    /^payment due date:/i.test(line) ||
    /^previous balance/i.test(line) ||
    /^statement date:/i.test(line) ||
    /^total$/i.test(line) ||
    /^\d{4}-\d{2}XX/i.test(line) ||
    /^=+/.test(line) ||
    /^[\d,.]+$/.test(line)
  );
}

function isStandardCharteredIgnoredDescriptionLine(line: string) {
  return (
    /^Page of \d+/i.test(line) ||
    /^Standard Chartered Bank\b/i.test(line) ||
    /^This statement serves\b/i.test(line) ||
    isStandardCharteredAccountSummaryLine(line)
  );
}

function isStandardCharteredStandaloneDescription(line: string) {
  return /^(annual fee|cashback|ezbal|ezpy|gst charges)/i.test(line);
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

function extractStatementMonth(text: string) {
  const statementDate = text.match(/Statement Date:\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);

  if (!statementDate) {
    return undefined;
  }

  const month = MONTHS[statementDate[2].slice(0, 3).toLowerCase()];

  if (!month) {
    return undefined;
  }

  return `${statementDate[3]}-${String(month).padStart(2, "0")}`;
}

function detectIssuer(text: string, fileName: string) {
  const haystack = `${fileName}\n${text.slice(0, 4000)}`.toLowerCase();
  const issuers = [
    ["standard chartered", "Standard Chartered"],
    ["american express", "American Express"],
    ["amex", "American Express"],
    ["bank of america", "Bank of America"],
    ["capital one", "Capital One"],
    ["chase", "Chase"],
    ["citi", "Citi"],
    ["discover", "Discover"],
    ["wells fargo", "Wells Fargo"],
  ] as const;
  const match = issuers.find(([needle]) => {
    return new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(haystack);
  });

  return match?.[1] ?? "Credit card";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(value: string, needle: string) {
  return value.split(needle).length - 1;
}
