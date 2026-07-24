import { NextResponse } from "next/server";
import { hasDatabaseUrl, updateTransactionCategory } from "@/lib/database";

export const runtime = "nodejs";

type TransactionRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateCategoryBody = {
  category?: unknown;
};

export async function PATCH(request: Request, { params }: TransactionRouteContext) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "DATABASE_URL is required before editing transactions." },
      { status: 503 },
    );
  }

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Transaction id is invalid." }, { status: 400 });
  }

  let body: UpdateCategoryBody;

  try {
    body = (await request.json()) as UpdateCategoryBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body.category !== "string") {
    return NextResponse.json({ error: "Category is required." }, { status: 400 });
  }

  const category = body.category.replace(/\s+/g, " ").trim();

  if (!category || category.length > 60) {
    return NextResponse.json(
      { error: "Category must be between 1 and 60 characters." },
      { status: 400 },
    );
  }

  try {
    const updated = await updateTransactionCategory(id, category);

    if (!updated) {
      return NextResponse.json({ error: "Transaction was not found." }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The transaction category could not be updated.",
      },
      { status: 500 },
    );
  }
}
