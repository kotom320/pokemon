"use client";

import Image from "next/image";
import type { EvolutionNode } from "@/lib/types";

function EvolutionStage({
  node,
  currentId,
  onNavigate,
  size = "md",
}: {
  node: EvolutionNode;
  currentId: number;
  onNavigate: (id: number) => void;
  size?: "sm" | "md";
}) {
  const isCurrent = node.id === currentId;
  const imgSize = size === "sm" ? "w-12 h-12" : "w-16 h-16";
  const imgPx = size === "sm" ? 48 : 64;

  return (
    <button
      onClick={() => !isCurrent && onNavigate(node.id)}
      disabled={isCurrent}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
        isCurrent
          ? "bg-red-50 ring-2 ring-red-300 cursor-default"
          : "hover:bg-gray-100"
      }`}
    >
      <div className={`relative ${imgSize}`}>
        <Image
          src={node.imageUrl}
          alt={node.koreanName}
          fill
          sizes={`${imgPx}px`}
          className="object-contain"
          unoptimized
        />
      </div>
      <p className={`text-xs font-medium text-center ${isCurrent ? "text-red-500" : "text-gray-700"}`}>
        {node.koreanName}
      </p>
    </button>
  );
}

function Arrow() {
  return <span className="text-gray-300 text-lg select-none shrink-0">▶</span>;
}

// 분기가 4개 초과이고 모두 최종 진화인 경우 — 이브이 패턴
function isRadialPattern(node: EvolutionNode): boolean {
  return (
    node.evolvesTo.length > 4 &&
    node.evolvesTo.every((child) => child.evolvesTo.length === 0)
  );
}

function RadialEvolutions({
  center,
  branches,
  currentId,
  onNavigate,
}: {
  center: EvolutionNode;
  branches: EvolutionNode[];
  currentId: number;
  onNavigate: (id: number) => void;
}) {
  const count = branches.length;
  const RADIUS = 115;
  const CONTAINER = 320;

  return (
    <div className="relative mx-auto" style={{ width: CONTAINER, height: CONTAINER }}>
      {/* 중심 포켓몬 */}
      <div
        className="absolute"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <EvolutionStage node={center} currentId={currentId} onNavigate={onNavigate} />
      </div>

      {/* 원형 배치 */}
      {branches.map((branch, i) => {
        const angle = (360 / count) * i - 90;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * RADIUS;
        const y = Math.sin(rad) * RADIUS;
        return (
          <div
            key={branch.id}
            className="absolute"
            style={{
              top: "50%",
              left: "50%",
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
          >
            <EvolutionStage node={branch} currentId={currentId} onNavigate={onNavigate} size="sm" />
          </div>
        );
      })}
    </div>
  );
}

function EvolutionBranch({
  node,
  currentId,
  onNavigate,
}: {
  node: EvolutionNode;
  currentId: number;
  onNavigate: (id: number) => void;
}) {
  if (node.evolvesTo.length === 0) {
    return <EvolutionStage node={node} currentId={currentId} onNavigate={onNavigate} />;
  }

  if (isRadialPattern(node)) {
    return (
      <RadialEvolutions
        center={node}
        branches={node.evolvesTo}
        currentId={currentId}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <EvolutionStage node={node} currentId={currentId} onNavigate={onNavigate} />
      <Arrow />
      <div className="flex flex-col gap-2">
        {node.evolvesTo.map((child) => (
          <EvolutionBranch key={child.id} node={child} currentId={currentId} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

export default function EvolutionChain({
  root,
  currentId,
  onNavigate,
}: {
  root: EvolutionNode;
  currentId: number;
  onNavigate: (id: number) => void;
}) {
  if (root.evolvesTo.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="font-semibold text-gray-700 mb-3">진화</h2>
      <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
        <div className="flex justify-center">
          <EvolutionBranch node={root} currentId={currentId} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}
