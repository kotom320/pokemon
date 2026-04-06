"use client";

const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

interface Props {
  selected: number | null;
  onChange: (gen: number | null) => void;
}

export default function GenerationFilter({ selected, onChange }: Props) {
  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => onChange(null)}
        className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
          selected === null ? "bg-red-400 text-white" : "bg-gray-100 text-gray-600"
        }`}
      >
        전체
      </button>
      {GENERATIONS.map((gen) => (
        <button
          key={gen}
          onClick={() => onChange(selected === gen ? null : gen)}
          className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selected === gen ? "bg-red-400 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          {gen}세대
        </button>
      ))}
    </div>
  );
}
