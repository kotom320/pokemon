import Image from "next/image";
import type { AlternateForm } from "@/lib/types";

interface Props {
  forms: AlternateForm[];
  currentId: number;
  onSelect: (id: number) => void;
}

export default function AlternateForms({ forms, currentId, onSelect }: Props) {
  return (
    <div className="mb-6">
      <h2 className="font-semibold text-gray-700 mb-3">다른 폼</h2>
      <div className="grid grid-cols-2 gap-3">
        {forms.map((form) => (
          <button
            key={form.slug}
            onClick={() => onSelect(form.id)}
            disabled={form.id === currentId}
            className="bg-gray-50 rounded-xl p-3 flex flex-col items-center gap-1 active:scale-95 active:bg-gray-100 transition-transform duration-100 select-none touch-manipulation w-full disabled:opacity-50 disabled:cursor-default disabled:active:scale-100"
          >
            <div className="relative w-20 h-20">
              <Image
                src={form.imageUrl}
                alt={form.koreanName}
                fill
                sizes="80px"
                className="object-contain"
              />
            </div>
            <p className="text-xs font-medium text-gray-700 text-center">
              {form.koreanName}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
