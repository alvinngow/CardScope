export const CATEGORY_COLORS: Record<string, string> = {
  "Dining": "#c44f3b",
  "Groceries": "#2f8f5b",
  "Transport": "#0f766e",
  "Travel": "#2274a5",
  "Shopping": "#bc8700",
  "Subscriptions": "#6f5e53",
  "Bills": "#5d737e",
  "Health": "#7a4e48",
  "Entertainment": "#8f6a00",
  "Instalments": "#2563eb",
  "Fees": "#8f2d1c",
  "Payments & credits": "#2f8f5b",
  "Other": "#66736f",
};

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Dining",
    keywords: [
      "bar",
      "burger",
      "cafe",
      "coffee",
      "delivery",
      "doordash",
      "food",
      "grill",
      "kitchen",
      "mcdonald",
      "pizza",
      "restaurant",
      "starbucks",
      "ubereats",
    ],
  },
  {
    category: "Groceries",
    keywords: [
      "aldi",
      "costco",
      "fresh",
      "grocery",
      "market",
      "safeway",
      "supermarket",
      "target",
      "trader joe",
      "walmart",
      "whole foods",
    ],
  },
  {
    category: "Transport",
    keywords: [
      "bolt",
      "bus",
      "caltrain",
      "gas",
      "grab",
      "lyft",
      "parking",
      "shell",
      "taxi",
      "toll",
      "train",
      "uber",
    ],
  },
  {
    category: "Travel",
    keywords: [
      "airbnb",
      "airline",
      "booking",
      "delta",
      "hotel",
      "hyatt",
      "marriott",
      "southwest",
      "travel",
      "united",
    ],
  },
  {
    category: "Shopping",
    keywords: [
      "amazon",
      "apple",
      "best buy",
      "department",
      "etsy",
      "ikea",
      "retail",
      "shop",
      "store",
    ],
  },
  {
    category: "Subscriptions",
    keywords: [
      "adobe",
      "apple.com/bill",
      "dropbox",
      "github",
      "google",
      "icloud",
      "netflix",
      "openai",
      "spotify",
      "subscription",
    ],
  },
  {
    category: "Bills",
    keywords: [
      "at&t",
      "bill",
      "comcast",
      "electric",
      "insurance",
      "internet",
      "mobile",
      "phone",
      "utility",
      "verizon",
    ],
  },
  {
    category: "Health",
    keywords: ["clinic", "dental", "doctor", "health", "hospital", "medical", "pharmacy", "rx"],
  },
  {
    category: "Entertainment",
    keywords: ["cinema", "concert", "hulu", "movie", "steam", "ticket", "theater"],
  },
  {
    category: "Instalments",
    keywords: ["easypay", "ezbal", "ezpy", "instalment", "installment"],
  },
  {
    category: "Fees",
    keywords: ["annual fee", "cash advance", "finance charge", "foreign transaction", "interest"],
  },
  {
    category: "Payments & credits",
    keywords: ["autopay", "credit", "payment", "refund", "reversal", "thank you"],
  },
];

export function categorizeMerchant(merchant: string, amount: number) {
  if (amount < 0) {
    return "Payments & credits";
  }

  const normalized = merchant.toLowerCase();
  const match = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword)),
  );

  return match?.category ?? "Other";
}

export function categoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other;
}
