"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { EvolutionNode } from "@/lib/types";

function EvolutionStage({ node, currentId }: { node: EvolutionNode; currentId: number }) {
  const router = useRouter();
  const isCurrent = node.id === currentId;
  return (
    <button
      onClick={() => !isCurrent && router.replace(`/pokemon/${node.id}`)}
      disabled={isCurrent}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
        isCurrent
          ? "bg-red-50 ring-2 ring-red-300 cursor-default"
          : "hover:bg-gray-100"
      }`}
    >
      <div className="relative w-16 h-16">
        <Image
          src={node.imageUrl}
          alt={node.koreanName}
          fill
          sizes="64px"
          className="object-contain"
        />
      </div>
      <p className={`text-xs font-medium text-center ${isCurrent ? "text-red-500" : "text-gray-700"}`}>
        {node.koreanName}
      </p>
    </button>
  );
}

function Arrow() {
  return (
    <span className="text-gray-300 text-lg select-none shrink-0">▶</span>
  );
}

function EvolutionBranch({ node, currentId }: { node: EvolutionNode; currentId: number }) {
  if (node.evolvesTo.length === 0) {
    return <EvolutionStage node={node} currentId={currentId} />;
  }

  return (
    <div className="flex items-center gap-2">
      <EvolutionStage node={node} currentId={currentId} />
      <Arrow />
      {/* 분기가 여러 개면 세로로 나열 */}
      <div className="flex flex-col gap-2">
        {node.evolvesTo.map((child) => (
          <EvolutionBranch key={child.id} node={child} currentId={currentId} />
        ))}
      </div>
    </div>
  );
}

export default function EvolutionChain({
  root,
  currentId,
}: {
  root: EvolutionNode;
  currentId: number;
}) {
  // 진화가 없는 포켓몬은 표시하지 않음
  if (root.evolvesTo.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="font-semibold text-gray-700 mb-3">진화</h2>
      <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
        <div className="flex justify-center">
          <EvolutionBranch node={root} currentId={currentId} />
        </div>
      </div>
    </div>
  );
}
