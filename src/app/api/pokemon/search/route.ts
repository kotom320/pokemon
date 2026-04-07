import { NextRequest, NextResponse } from "next/server";
import { searchPokemon } from "@/lib/api";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const items = await searchPokemon(q);
  return NextResponse.json({ items });
}
