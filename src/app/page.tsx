import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { GENERATION_RANGES } from "@/lib/api";
import Header from "@/components/Header";
import PokemonGrid from "@/components/PokemonGrid";
import PokemonCard from "@/components/PokemonCard";
import type { PokemonListItem } from "@/lib/types";

const PAGE_SIZE = 20;

function toListItem(row: {
  id: number;
  name: string;
  korean_name: string;
  image_url: string;
  types: string[];
}): PokemonListItem {
  return {
    id: row.id,
    name: row.name,
    koreanName: row.korean_name,
    imageUrl: row.image_url,
    types: row.types,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; generation?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const generation = sp.generation ? Number(sp.generation) : null;
  const type = sp.type ?? null;

  // 검색 모드 — 결과 고정, 무한 스크롤 불필요
  if (q.trim()) {
    const isNumeric = /^\d+$/.test(q.trim());
    const query = isNumeric
      ? supabase.from("pokemon").select("*").eq("id", Number(q.trim()))
      : supabase.from("pokemon").select("*").ilike("korean_name", `%${q.trim()}%`).order("id").limit(40);

    const { data } = await query;
    const items = (data ?? []).map(toListItem);

    return (
      <>
        <Suspense><Header /></Suspense>
        <main className="max-w-5xl mx-auto px-4 py-6">
          <p className="text-sm text-gray-400 mb-4">검색 결과 {items.length}마리</p>
          {items.length === 0 ? (
            <p className="text-center text-gray-400 mt-12">검색 결과가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((pokemon) => <PokemonCard key={pokemon.id} pokemon={pokemon} />)}
            </div>
          )}
        </main>
      </>
    );
  }

  // 목록 모드 — 첫 페이지 SSR + TanStack Query 무한 스크롤
  let query = supabase.from("pokemon").select("*", { count: "exact" });
  if (generation && GENERATION_RANGES[generation]) {
    const { start, end } = GENERATION_RANGES[generation];
    query = query.gte("id", start).lte("id", end);
  }
  if (type) query = query.contains("types", [type]);

  const { data, count } = await query.order("id").range(0, PAGE_SIZE - 1);
  const items = (data ?? []).map(toListItem);
  const total = count ?? 0;
  const gridKey = `${generation}-${type}`;

  return (
    <>
      <Suspense><Header /></Suspense>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-400 mb-4">총 {total}마리</p>
        {items.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">포켓몬이 없습니다.</p>
        ) : (
          <PokemonGrid
            key={gridKey}
            gridKey={gridKey}
            initialItems={items}
            total={total}
            generation={generation}
            type={type}
          />
        )}
      </main>
    </>
  );
}
