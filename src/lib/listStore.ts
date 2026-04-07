import { create } from "zustand";
import type { PokemonListItem } from "./types";

interface GridSnapshot {
  key: string;
  extra: PokemonListItem[];
  done: boolean;
  scrollY: number;
}

interface ListStore {
  snapshot: GridSnapshot | null;
  save: (snapshot: GridSnapshot) => void;
}

export const useListStore = create<ListStore>((set) => ({
  snapshot: null,
  save: (snapshot) => set({ snapshot }),
}));
