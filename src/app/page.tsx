"use client";

import { Suspense, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import PokemonCard from "@/components/PokemonCard";
import GenerationFilter from "@/components/GenerationFilter";
import type { PokemonListItem } from "@/lib/types";

const PAGE_SIZE = 20;

async function fetchPokemonPage(
  offset: number,
  generation: number | null,
): Promise<{ items: PokemonListItem[]; total: number }> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (generation) params.set("generation", String(generation));
  const res = await fetch(`/api/pokemon?${params}`);
  if (!res.ok) throw new Error("포켓몬 목록을 불러오지 못했습니다.");
  return res.json();
}

function PokemonList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const generation = searchParams.get("generation") ? Number(searchParams.get("generation")) : null;

  function handleGenerationChange(gen: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (gen) {
      params.set("generation", String(gen));
    } else {
      params.delete("generation");
    }
    router.replace(`/?${params}`, { scroll: false });
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, isError } =
    useInfiniteQuery({
      queryKey: ["pokemon-list", generation],
      queryFn: ({ pageParam }) => fetchPokemonPage(pageParam, generation),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.items.length === 0) return undefined;
        const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
        return loaded < lastPage.total ? loaded : undefined;
      },
      retry: 1,
    });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && !isError) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isError]);

  const pokemonList = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? null;

  return (
    <>
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">포켓몬 도감</h1>
        {total !== null && (
          <p className="text-sm text-gray-500 mt-1">총 {total}마리</p>
        )}
      </header>

      <div className="-mx-4 px-4 mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <GenerationFilter selected={generation} onChange={handleGenerationChange} />
      </div>

      {status === "error" && (
        <p className="text-center text-red-500">데이터를 불러오지 못했습니다.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {pokemonList.map((pokemon) => (
          <PokemonCard key={pokemon.id} pokemon={pokemon} />
        ))}
      </div>

      {isFetchingNextPage && (
        <div className="flex justify-center mt-8">
          <div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
    </>
  );
}

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <Suspense>
        <PokemonList />
      </Suspense>
    </main>
  );
}
