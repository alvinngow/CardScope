import { CATEGORY_COLORS } from "@/lib/categories";
import type { ParsedStatement, ParsedTransaction } from "@/lib/statementParser";

type DeepSeekCategoryCandidate = {
  amount: number;
  merchant: string;
  sample: string;
};

type DeepSeekCategoryAssignment = {
  category: string;
  confidence: number;
  merchant: string;
  reason: string;
};

type DeepSeekCategoryResponse = {
  categories: DeepSeekCategoryAssignment[];
};

type DeepSeekChatResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string | null;
    };
  }>;
};

const DEFAULT_DEEPSEEK_CATEGORIZATION_MODEL = "deepseek-v4-flash";
const MAX_DEEPSEEK_CATEGORY_MERCHANTS = 80;
const MIN_DEEPSEEK_CATEGORY_CONFIDENCE = 0.5;

export async function categorizeParsedStatementWithDeepSeek(
  statement: ParsedStatement,
): Promise<ParsedStatement> {
  const { candidates, overflowCount } = collectDeepSeekCategoryCandidates(statement.transactions);
  const warnings = [...statement.warnings];

  if (!candidates.length) {
    return statement;
  }

  if (overflowCount > 0) {
    warnings.push(
      `DeepSeek categorization reviewed the first ${MAX_DEEPSEEK_CATEGORY_MERCHANTS} unknown merchants; ${overflowCount} stayed Other.`,
    );
  }

  if (process.env.DEEPSEEK_CATEGORIZATION_ENABLED === "false") {
    return {
      ...statement,
      warnings: [
        ...warnings,
        `DeepSeek categorization is disabled; ${candidates.length} unknown merchant(s) stayed Other.`,
      ],
    };
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return {
      ...statement,
      warnings: [
        ...warnings,
        `DEEPSEEK_API_KEY is not set; ${candidates.length} unknown merchant(s) stayed Other.`,
      ],
    };
  }

  try {
    const categories = await requestDeepSeekCategories(candidates);
    const transactions = applyDeepSeekCategories(statement.transactions, categories);

    return {
      ...statement,
      transactions,
      warnings,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown DeepSeek categorization error.";

    return {
      ...statement,
      warnings: [...warnings, `DeepSeek categorization failed; unknown merchants stayed Other. ${detail}`],
    };
  }
}

function collectDeepSeekCategoryCandidates(transactions: ParsedTransaction[]) {
  const byMerchant = new Map<string, DeepSeekCategoryCandidate>();

  for (const transaction of transactions) {
    if (
      transaction.amount <= 0 ||
      transaction.category !== "Other" ||
      transaction.categorySource !== "rules"
    ) {
      continue;
    }

    const key = merchantKey(transaction.merchant);

    if (!key || byMerchant.has(key)) {
      continue;
    }

    byMerchant.set(key, {
      amount: transaction.amount,
      merchant: transaction.merchant,
      sample: sanitizeTransactionSample(transaction.rawText),
    });
  }

  const candidates = [...byMerchant.values()];

  return {
    candidates: candidates.slice(0, MAX_DEEPSEEK_CATEGORY_MERCHANTS),
    overflowCount: Math.max(0, candidates.length - MAX_DEEPSEEK_CATEGORY_MERCHANTS),
  };
}

async function requestDeepSeekCategories(candidates: DeepSeekCategoryCandidate[]) {
  const response = await fetch(deepSeekChatCompletionsUrl(), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_CATEGORIZATION_MODEL ?? DEFAULT_DEEPSEEK_CATEGORIZATION_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You categorize personal credit-card spending for a Singapore-focused ledger. " +
            "Return valid JSON only. Prefer existing categories when they fit. " +
            "Create a new broad, reusable category only when none of the existing categories fit well. " +
            "Never create a category from a merchant name, brand, mall, city, or country. " +
            "Do not use Payments & credits for positive spending. " +
            'Example JSON: {"categories":[{"merchant":"Example Store","category":"Shopping","confidence":0.82,"reason":"Retail purchase"}]}',
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              "Categorize every merchant and return JSON with a categories array. Use merchant strings exactly as provided.",
            existingCategories: Object.keys(CATEGORY_COLORS),
            merchants: candidates,
          }),
        },
      ],
      max_tokens: Number(process.env.DEEPSEEK_CATEGORIZATION_MAX_TOKENS ?? 4000),
      response_format: {
        type: "json_object",
      },
      temperature: 0,
      thinking: {
        type: process.env.DEEPSEEK_CATEGORIZATION_THINKING === "enabled" ? "enabled" : "disabled",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek returned ${response.status}.`);
  }

  const payload = (await response.json()) as DeepSeekChatResponse;
  const choice = payload.choices?.[0];

  if (!choice?.message?.content) {
    throw new Error("DeepSeek response did not include message content.");
  }

  if (choice.finish_reason === "length") {
    throw new Error("DeepSeek response was truncated.");
  }

  const parsed = parseDeepSeekCategoryResponse(choice.message.content);
  const categories = new Map<string, string>();

  for (const assignment of parsed.categories) {
    const key = merchantKey(assignment.merchant);
    const category = sanitizeDeepSeekCategory(assignment.category);

    if (!key || !category || assignment.confidence < MIN_DEEPSEEK_CATEGORY_CONFIDENCE) {
      continue;
    }

    if (category === "Other" || category === "Payments & credits") {
      continue;
    }

    categories.set(key, category);
  }

  return categories;
}

function applyDeepSeekCategories(
  transactions: ParsedTransaction[],
  categories: Map<string, string>,
) {
  if (!categories.size) {
    return transactions;
  }

  return transactions.map((transaction) => {
    if (
      transaction.amount <= 0 ||
      transaction.category !== "Other" ||
      transaction.categorySource !== "rules"
    ) {
      return transaction;
    }

    const category = categories.get(merchantKey(transaction.merchant));

    if (!category) {
      return transaction;
    }

    return {
      ...transaction,
      category,
      categorySource: "deepseek" as const,
    };
  });
}

function deepSeekChatCompletionsUrl() {
  return `${(process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")}/chat/completions`;
}

function parseDeepSeekCategoryResponse(text: string): DeepSeekCategoryResponse {
  const parsed = JSON.parse(stripJsonCodeFence(text)) as unknown;

  if (!isRecord(parsed) || !Array.isArray(parsed.categories)) {
    throw new Error("DeepSeek categorization response was not in the expected shape.");
  }

  return {
    categories: parsed.categories.filter(isDeepSeekCategoryAssignment),
  };
}

function isDeepSeekCategoryAssignment(value: unknown): value is DeepSeekCategoryAssignment {
  return (
    isRecord(value) &&
    typeof value.merchant === "string" &&
    typeof value.category === "string" &&
    typeof value.reason === "string" &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence)
  );
}

function sanitizeDeepSeekCategory(value: string) {
  const cleaned = value
    .replace(/[^A-Za-z0-9&/ -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length > 40) {
    return null;
  }

  const existing = Object.keys(CATEGORY_COLORS).find(
    (category) => category.toLowerCase() === cleaned.toLowerCase(),
  );

  if (existing) {
    return existing;
  }

  if (/^(unknown|uncategorized)$/i.test(cleaned)) {
    return "Other";
  }

  return cleaned
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (["&", "/", "ev", "it", "sg"].includes(word)) {
        return word.toUpperCase();
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function sanitizeTransactionSample(rawText: string) {
  return rawText
    .replace(/\bTransaction Ref\s+\d+\b/gi, "Transaction Ref")
    .replace(/\b\d{6,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function stripJsonCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function merchantKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
