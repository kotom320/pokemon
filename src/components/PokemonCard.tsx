import Image from "next/image";
import Link from "next/link";
import type { PokemonListItem } from "@/lib/types";

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

export default function PokemonCard({ pokemon }: { pokemon: PokemonListItem }) {
  return (
    <Link href={`/pokemon/${pokemon.id}`} className="touch-manipulation">
      <div className="bg-white rounded-2xl shadow-sm active:scale-95 active:shadow-none transition-transform duration-100 p-4 flex flex-col items-center gap-2 select-none">
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full self-start font-mono">
          {String(pokemon.id).padStart(3, "0")}
        </span>
        <div className="relative w-24 h-24">
          <Image
            src={pokemon.imageUrl}
            alt={pokemon.koreanName}
            fill
            sizes="96px"
            className="object-contain transition-opacity duration-200"
            placeholder="empty"
          />
        </div>
        <p className="font-semibold text-gray-800 text-sm">{pokemon.koreanName}</p>
        <div className="flex gap-1 flex-wrap justify-center">
          {pokemon.types.map((type) => (
            <span
              key={type}
              className={`text-xs text-white px-2 py-0.5 rounded-full ${TYPE_COLORS[type] ?? "bg-gray-400"}`}
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
