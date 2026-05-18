import { NextResponse } from "next/server";
import { db } from "@/lib/aws/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { workId: string } }
) {
  const { rows } = await db.query(
    "SELECT * FROM works WHERE id = $1",
    [params.workId]
  );
  if (rows.length === 0) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}
