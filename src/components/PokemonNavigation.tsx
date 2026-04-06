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

      {/* prev/next 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-between bg-white border-t border-gray-100 px-6 py-3 z-10">
        {displayId > 1 ? (
          <button
            onClick={() => router.replace(`/pokemon/${displayId - 1}`)}
            className="text-sm text-gray-500 active:text-gray-800 touch-manipulation py-2 pr-4"
          >
            ← {String(displayId - 1).padStart(3, "0")}
          </button>
        ) : (
          <span />
        )}
        {displayId < 1025 && (
          <button
            onClick={() => router.replace(`/pokemon/${displayId + 1}`)}
            className="text-sm text-gray-500 active:text-gray-800 touch-manipulation py-2 pl-4"
          >
            {String(displayId + 1).padStart(3, "0")} →
          </button>
        )}
      </div>
      {/* fixed bar 높이만큼 여백 확보 */}
      <div className="h-12" />
    </>
  );
}
