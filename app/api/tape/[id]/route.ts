import { NextResponse } from "next/server";
import { getTape } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tape = await getTape(id);
  if (!tape) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ tape });
}
