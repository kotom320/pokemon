import { NextRequest, NextResponse } from "next/server";
import { getPokemonList } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);
  const generation = searchParams.get("generation");

  const data = await getPokemonList(
    limit,
    offset,
    generation ? Number(generation) : undefined,
  );
  return NextResponse.json(data);
}
