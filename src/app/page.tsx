"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PokemonCard from "@/components/PokemonCard";
import type { PokemonListItem } from "@/lib/types";

const PAGE_SIZE = 20;

export default function Home() {
  const [pokemonList, setPokemonList] = useState<PokemonListItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading) return;
    if (total !== null && offset >= total) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/pokemon?limit=${PAGE_SIZE}&offset=${offset}`);
      const data: { items: PokemonListItem[]; total: number } = await res.json();
      setPokemonList((prev) => [...prev, ...data.items]);
      setTotal(data.total);
      setOffset((prev) => prev + PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, [loading, offset, total]);

  // 무한 스크롤
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">포켓몬 도감</h1>
        {total !== null && (
          <p className="text-sm text-gray-500 mt-1">총 {total}마리</p>
        )}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {pokemonList.map((pokemon) => (
          <PokemonCard key={pokemon.id} pokemon={pokemon} />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center mt-8">
          <div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
    </main>
  );
}
