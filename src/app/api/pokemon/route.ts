import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GENERATION_RANGES } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);
  const generation = searchParams.get("generation") ? Number(searchParams.get("generation")) : null;
  const type = searchParams.get("type") ?? null;

  let query = supabase.from("pokemon").select("*", { count: "exact" });

  if (generation && GENERATION_RANGES[generation]) {
    const { start, end } = GENERATION_RANGES[generation];
    query = query.gte("id", start).lte("id", end);
  }

  if (type) {
    query = query.contains("types", [type]);
  }

  const { data, count, error } = await query
    .order("id")
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    koreanName: row.korean_name,
    imageUrl: row.image_url,
    types: row.types,
  }));

  return NextResponse.json({ items, total: count ?? 0 });
}
