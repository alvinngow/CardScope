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

const MANAGED_CATEGORIES = new Set(Object.keys(CATEGORY_COLORS));

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Dining",
    keywords: [
      "astons",
      "bar",
      "burger",
      "cafe",
      "chagee",
      "choc a bloc",
      "coffee",
      "dalcomhan",
      "delivery",
      "doordash",
      "flow innovation",
      "food",
      "grill",
      "gu zao ren",
      "hawker",
      "italian osteria",
      "kitchen",
      "koufu",
      "kopitiam",
      "mcdonald",
      "nam kee",
      "pizza",
      "red star",
      "restaurant",
      "starbucks",
      "toast",
      "ubereats",
    ],
  },
  {
    category: "Groceries",
    keywords: [
      "aldi",
      "costco",
      "don don donki",
      "donki",
      "fairprice",
      "fp xtra",
      "fresh",
      "grocery",
      "market",
      "ntuc",
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
      "cdg",
      "engie",
      "ev charger",
      "ev hub",
      "flashpay",
      "gas",
      "grab",
      "lyft",
      "mnl- ev",
      "parking",
      "shell",
      "strides ytl",
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
      "trip.com",
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
      "giordano",
      "ikea",
      "retail",
      "shop",
      "voucher",
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
      "broadband",
      "comcast",
      "electric",
      "gomo",
      "insurance",
      "internet",
      "mobile",
      "myrepublic",
      "phone",
      "singtel",
      "telecom",
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
    keywords: ["annual fee", "cash advance", "finance charge", "foreign transaction", "gst charges", "interest"],
  },
  {
    category: "Payments & credits",
    keywords: ["autopay", "cashback", "credit", "dbsbankpaymen", "payment", "refund", "reversal", "thank you"],
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

export function isManagedCategory(category: string) {
  return MANAGED_CATEGORIES.has(category);
}
