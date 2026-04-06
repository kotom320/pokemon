import { NextRequest, NextResponse } from "next/server";
import { getPokemonDetail } from "@/lib/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId) || numId < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const data = await getPokemonDetail(numId);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
