"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilterDrawer from "./FilterDrawer";

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generation = searchParams.get("generation") ? Number(searchParams.get("generation")) : null;
  const type = searchParams.get("type") ?? null;
  const activeCount = (generation !== null ? 1 : 0) + (type !== null ? 1 : 0);

  // 검색어 디바운스
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("q", query.trim());
        params.delete("generation");
        params.delete("type");
      } else {
        params.delete("q");
      }
      router.replace(`/?${params}`, { scroll: false });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);  // eslint-disable-line react-hooks/exhaustive-deps

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== null) {
      params.set(key, value);
      params.delete("q");
      setQuery("");
    } else {
      params.delete(key);
    }
    router.replace(`/?${params}`, { scroll: false });
  }

  function handleReset() {
    const params = new URLSearchParams();
    router.replace("/", { scroll: false });
    setDrawerOpen(false);
    setQuery("");
  }

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* 타이틀 */}
        <span className="font-bold text-gray-900 text-lg shrink-0">포켓몬 도감</span>

        {/* 검색창 */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 또는 번호"
            className="w-full pl-8 pr-3 py-2 rounded-full bg-gray-100 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>

        {/* 필터 버튼 */}
        <button
          onClick={() => setDrawerOpen((v) => !v)}
          className="relative shrink-0 p-2 rounded-full touch-manipulation active:bg-gray-100"
          aria-label="필터"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
          </svg>
          {activeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <FilterDrawer
        open={drawerOpen}
        generation={generation}
        type={type}
        onGenerationChange={(gen) => {
          updateParam("generation", gen !== null ? String(gen) : null);
        }}
        onTypeChange={(t) => {
          updateParam("type", t);
        }}
        onReset={handleReset}
      />
    </div>
  );
}
