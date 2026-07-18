import { NextResponse } from "next/server";
import { hasDatabaseUrl, overviewFromDatabase } from "@/lib/database";
import { emptyOverview } from "@/lib/emptyOverview";

export const runtime = "nodejs";

export async function GET() {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      emptyOverview("Set DATABASE_URL to connect CardScope to your Postgres database."),
    );
  }

  try {
    return NextResponse.json(await overviewFromDatabase());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database connection failed.";

    return NextResponse.json(
      emptyOverview(`Postgres is not reachable yet: ${message}`),
      { status: 200 },
    );
  }
}
