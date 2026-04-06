"use client";

import { useRouter } from "next/navigation";

interface Props {
  displayId: number;
}

export default function PokemonNavigation({ displayId }: Props) {
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-gray-500 active:text-gray-800 mb-6 touch-manipulation py-2 pr-2"
      >
        ← 목록으로
      </button>

      <div className="flex justify-between mt-6">
        {displayId > 1 && (
          <button
            onClick={() => router.replace(`/pokemon/${displayId - 1}`)}
            className="text-sm text-gray-500 active:text-gray-800 touch-manipulation py-3 pr-4"
          >
            ← {String(displayId - 1).padStart(3, "0")}
          </button>
        )}
        <button
          onClick={() => router.replace(`/pokemon/${displayId + 1}`)}
          className="text-sm text-gray-500 active:text-gray-800 touch-manipulation py-3 pl-4 ml-auto"
        >
          {String(displayId + 1).padStart(3, "0")} →
        </button>
      </div>
    </>
  );
}
