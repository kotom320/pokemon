"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import PokemonCard from "@/components/PokemonCard";
import type { PokemonListItem } from "@/lib/types";

const PAGE_SIZE = 20;

async function fetchPokemonPage(offset: number): Promise<{ items: PokemonListItem[]; total: number }> {
  const res = await fetch(`/api/pokemon?limit=${PAGE_SIZE}&offset=${offset}`);
  if (!res.ok) throw new Error("포켓몬 목록을 불러오지 못했습니다.");
  return res.json();
}

export default function Home() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, isError } =
    useInfiniteQuery({
      queryKey: ["pokemon-list"],
      queryFn: ({ pageParam }) => fetchPokemonPage(pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.items.length === 0) return undefined;
        const loaded = allPages.length * PAGE_SIZE;
        return loaded < lastPage.total ? loaded : undefined;
      },
      retry: 1,
    });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 무한 스크롤
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
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">포켓몬 도감</h1>
        {total !== null && (
          <p className="text-sm text-gray-500 mt-1">총 {total}마리</p>
        )}
      </header>

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
    </main>
  );
}
