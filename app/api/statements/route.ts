import { NextResponse } from "next/server";
import { categorizeParsedStatementWithDeepSeek } from "@/lib/deepseekCategorizer";
import { hasDatabaseUrl, saveStatement } from "@/lib/database";
import { parseStatementFile } from "@/lib/statementParser";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "DATABASE_URL is required before importing real statements." },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("statement");
    const statementMonth = String(formData.get("statementMonth") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a statement file first." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Statement files must be 12 MB or smaller." },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsedStatement = await parseStatementFile(
      file.name,
      file.type,
      buffer,
      /^\d{4}-\d{2}$/.test(statementMonth) ? statementMonth : undefined,
    );
    const parsed = await categorizeParsedStatementWithDeepSeek(parsedStatement);

    if (!parsed.transactions.length) {
      return NextResponse.json(
        { error: "No transactions were recognized in this statement." },
        { status: 422 },
      );
    }

    const saved = await saveStatement(file.name, parsed);

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The statement could not be imported.",
      },
      { status: 500 },
    );
  }
}
