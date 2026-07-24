import { NextResponse } from "next/server";
import { deleteStatement, hasDatabaseUrl } from "@/lib/database";

export const runtime = "nodejs";

type StatementRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, { params }: StatementRouteContext) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "DATABASE_URL is required before removing statements." },
      { status: 503 },
    );
  }

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Statement id is invalid." }, { status: 400 });
  }

  try {
    const wasDeleted = await deleteStatement(id);

    if (!wasDeleted) {
      return NextResponse.json({ error: "Statement was not found." }, { status: 404 });
    }

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The statement could not be removed.",
      },
      { status: 500 },
    );
  }
}
