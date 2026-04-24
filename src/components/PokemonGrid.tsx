"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import PokemonCard from "./PokemonCard";
import type { PokemonListItem } from "@/lib/types";

const PAGE_SIZE = 40;

interface Props {
  gridKey: string;
  initialItems: PokemonListItem[];
  total: number;
  generation: number | null;
  type: string | null;
}

// gridKey별 스크롤 위치 저장 (모듈 레벨 — 직렬화 불필요)
const scrollMap = new Map<string, number>();

async function fetchPage(
  offset: number,
  generation: number | null,
  type: string | null,
): Promise<{ items: PokemonListItem[]; total: number }> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (generation) params.set("generation", String(generation));
  if (type) params.set("type", type);
  const res = await fetch(`/api/pokemon?${params}`);
  return res.json();
}

export default function PokemonGrid({ gridKey, initialItems, total, generation, type }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["pokemon-list", gridKey],
    queryFn: ({ pageParam }) => fetchPage(pageParam as number, generation, type),
    initialData: {
      pages: [{ items: initialItems, total }],
      pageParams: [0],
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    gcTime: Infinity,   // 언마운트 후에도 캐시 유지 → 뒤로가기 시 즉시 렌더
    staleTime: 1000 * 60 * 5,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const items = data.pages.flatMap((p) => p.items);

  // 마운트 시 스크롤 처리
  // - 뒤로가기(scrollMap에 저장된 값 있음): 해당 위치로 복원
  // - 필터 변경 등 새 진입(저장값 없음): 상단으로 초기화
  useEffect(() => {
    const y = scrollMap.get(gridKey);
    if (y) {
      scrollMap.delete(gridKey);
      window.scrollTo({ top: y });
    } else {
      window.scrollTo({ top: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 무한 스크롤
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  function handleNavigate() {
    scrollMap.set(gridKey, window.scrollY);
  }

  return (
    <div onClick={handleNavigate}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((pokemon) => (
          <PokemonCard key={pokemon.id} pokemon={pokemon} />
        ))}
      </div>

      {isFetchingNextPage && (
        <div className="flex justify-center mt-8">
          <div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
    </div>
  );
}
