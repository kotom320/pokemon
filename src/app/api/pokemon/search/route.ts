import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ items: [] });

  // 번호 검색 (숫자로 시작하면 id 기준)
  const isNumeric = /^\d+$/.test(q);

  let data, error;

  if (isNumeric) {
    const result = await supabase
      .from("pokemon")
      .select("*")
      .eq("id", Number(q))
      .limit(1);
    data = result.data;
    error = result.error;
  } else {
    const result = await supabase
      .from("pokemon")
      .select("*")
      .ilike("korean_name", `%${q}%`)
      .order("id")
      .limit(40);
    data = result.data;
    error = result.error;
  }

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

  return NextResponse.json({ items });
}
