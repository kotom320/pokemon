"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { PokemonDetail } from "@/lib/types";
import AlternateForms from "@/components/AlternateForms";
import EvolutionChain from "@/components/EvolutionChain";

const TYPE_COLORS: Record<string, string> = {
  불꽃: "bg-orange-400",
  물: "bg-blue-400",
  풀: "bg-green-500",
  전기: "bg-yellow-400",
  얼음: "bg-cyan-300",
  격투: "bg-red-600",
  독: "bg-purple-500",
  땅: "bg-yellow-600",
  비행: "bg-indigo-300",
  에스퍼: "bg-pink-400",
  벌레: "bg-lime-500",
  바위: "bg-yellow-700",
  고스트: "bg-indigo-600",
  드래곤: "bg-indigo-500",
  악: "bg-gray-700",
  강철: "bg-gray-400",
  페어리: "bg-pink-300",
  노말: "bg-gray-400",
};

const STAT_MAX = 255;

export default function PokemonDetailView({ initialData }: { initialData: PokemonDetail }) {
  const [pokemon, setPokemon] = useState<PokemonDetail>(initialData);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleFormSelect(formId: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/pokemon/${formId}`);
      if (!res.ok) throw new Error();
      const data: PokemonDetail = await res.json();
      setPokemon(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`w-full bg-white rounded-2xl shadow-sm p-6 transition-opacity duration-150 ${loading ? "opacity-50" : ""}`}>
      {/* 헤더 */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <span className="text-sm bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-mono">
          {String(pokemon.displayId).padStart(3, "0")}
        </span>
        <div className="relative w-40 h-40">
          <Image
            src={pokemon.imageUrl}
            alt={pokemon.koreanName}
            fill
            sizes="160px"
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{pokemon.koreanName}</h1>
        <div className="flex gap-2">
          {pokemon.types.map((type) => (
            <span
              key={type}
              className={`text-sm text-white px-3 py-1 rounded-full ${TYPE_COLORS[type] ?? "bg-gray-400"}`}
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-center">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">키</p>
          <p className="font-semibold text-gray-800">
            {(pokemon.height / 10).toFixed(1)} m
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">몸무게</p>
          <p className="font-semibold text-gray-800">
            {(pokemon.weight / 10).toFixed(1)} kg
          </p>
        </div>
      </div>

      {/* 도감 설명 */}
      {pokemon.description && (
        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 mb-6">
          {pokemon.description}
        </p>
      )}

      {/* 진화 */}
      {pokemon.evolutionChain && (
        <EvolutionChain
          root={pokemon.evolutionChain}
          currentId={pokemon.displayId}
          onNavigate={(id) => {
            if (id === pokemon.displayId) {
              // 같은 종 — 인라인으로 기본 폼 복원
              handleFormSelect(id);
            } else {
              router.replace(`/pokemon/${id}`);
            }
          }}
        />
      )}

      {/* 다른 폼 */}
      {pokemon.alternateForms.length > 0 && (
        <AlternateForms
          forms={pokemon.alternateForms}
          currentId={pokemon.id}
          onSelect={handleFormSelect}
        />
      )}

      {/* 스탯 */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-3">기본 능력치</h2>
        <div className="flex flex-col gap-2">
          {pokemon.stats.map((stat) => (
            <div key={stat.name} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-16 shrink-0 text-right">
                {stat.name}
              </span>
              <span className="text-sm font-semibold text-gray-800 w-8 shrink-0">
                {stat.value}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-red-400 h-2 rounded-full transition-all"
                  style={{ width: `${(stat.value / STAT_MAX) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
