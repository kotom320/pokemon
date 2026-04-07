"use client";

import { Suspense, useEffect, useRef } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import PokemonCard from "@/components/PokemonCard";
import Header from "@/components/Header";
import type { PokemonListItem } from "@/lib/types";

const PAGE_SIZE = 20;

async function fetchPokemonPage(
  offset: number,
  generation: number | null,
  type: string | null,
): Promise<{ items: PokemonListItem[]; total: number }> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (generation) params.set("generation", String(generation));
  if (type) params.set("type", type);
  const res = await fetch(`/api/pokemon?${params}`);
  if (!res.ok) throw new Error("포켓몬 목록을 불러오지 못했습니다.");
  return res.json();
}

async function fetchSearch(q: string): Promise<PokemonListItem[]> {
  const res = await fetch(`/api/pokemon/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data: { items: PokemonListItem[] } = await res.json();
  return data.items;
}

function PokemonList() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const generation = searchParams.get("generation") ? Number(searchParams.get("generation")) : null;
  const type = searchParams.get("type") ?? null;
  const isSearchMode = q.trim().length > 0;

  // 검색 모드
  const { data: searchResults, isFetching: searchLoading } = useQuery({
    queryKey: ["pokemon-search", q],
    queryFn: () => fetchSearch(q),
    enabled: isSearchMode,
    staleTime: 1000 * 60 * 5,
  });

  // 목록 모드 (무한 스크롤)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, isError } =
    useInfiniteQuery({
      queryKey: ["pokemon-list", generation, type],
      queryFn: ({ pageParam }) => fetchPokemonPage(pageParam, generation, type),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.items.length === 0) return undefined;
        const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
        return loaded < lastPage.total ? loaded : undefined;
      },
      retry: 1,
      enabled: !isSearchMode,
    });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isSearchMode) return;
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isError, isSearchMode]);

  if (isSearchMode) {
    return (
      <>
        {searchLoading && (
          <div className="flex justify-center mt-12">
            <div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!searchLoading && searchResults && (
          <>
            <p className="text-sm text-gray-400 mb-4">검색 결과 {searchResults.length}마리</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchResults.map((pokemon) => (
                <PokemonCard key={pokemon.id} pokemon={pokemon} />
              ))}
            </div>
            {searchResults.length === 0 && (
              <p className="text-center text-gray-400 mt-12">검색 결과가 없습니다.</p>
            )}
          </>
        )}
      </>
    );
  }

  const pokemonList = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? null;

  return (
    <>
      {total !== null && (
        <p className="text-sm text-gray-400 mb-4">총 {total}마리</p>
      )}

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
    <>
      <Suspense>
        <Header />
      </Suspense>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Suspense>
          <PokemonList />
        </Suspense>
      </main>
    </>
  );
}
