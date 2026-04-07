"use client";

import { ALL_TYPES } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  노말: "bg-gray-400", 불꽃: "bg-orange-400", 물: "bg-blue-400",
  풀: "bg-green-500", 전기: "bg-yellow-400", 얼음: "bg-cyan-300",
  격투: "bg-red-600", 독: "bg-purple-500", 땅: "bg-yellow-600",
  비행: "bg-indigo-300", 에스퍼: "bg-pink-400", 벌레: "bg-lime-500",
  바위: "bg-yellow-700", 고스트: "bg-indigo-600", 드래곤: "bg-indigo-500",
  악: "bg-gray-700", 강철: "bg-gray-400", 페어리: "bg-pink-300",
};

const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

interface Props {
  open: boolean;
  generation: number | null;
  type: string | null;
  onGenerationChange: (gen: number | null) => void;
  onTypeChange: (type: string | null) => void;
  onReset: () => void;
}

export default function FilterDrawer({
  open, generation, type, onGenerationChange, onTypeChange, onReset,
}: Props) {
  if (!open) return null;

  return (
    <div className="bg-white border-b border-gray-100 shadow-sm px-4 py-4 flex flex-col gap-4">
      {/* 세대 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-2">세대</p>
        <div className="flex flex-wrap gap-1.5">
          {GENERATIONS.map((gen) => (
            <button
              key={gen}
              onClick={() => onGenerationChange(generation === gen ? null : gen)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors touch-manipulation ${
                generation === gen ? "bg-red-400 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {gen}세대
            </button>
          ))}
        </div>
      </div>

      {/* 타입 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-2">타입</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => onTypeChange(type === t ? null : t)}
              className={`px-3 py-1 rounded-full text-sm font-medium text-white transition-opacity touch-manipulation ${
                TYPE_COLORS[t] ?? "bg-gray-400"
              } ${type !== null && type !== t ? "opacity-40" : "opacity-100"} ${
                type === t ? "ring-2 ring-offset-1 ring-gray-700" : ""
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 초기화 */}
      {(generation !== null || type !== null) && (
        <button
          onClick={onReset}
          className="self-start text-xs text-gray-400 underline underline-offset-2 touch-manipulation"
        >
          필터 초기화
        </button>
      )}
    </div>
  );
}
