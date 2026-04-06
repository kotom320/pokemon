export interface PokemonListItem {
  id: number;
  name: string;         // 영문 slug (API용)
  koreanName: string;   // 한국어 이름
  imageUrl: string;
  types: string[];      // 한국어 타입명
}

export interface PokemonDetail extends PokemonListItem {
  height: number;       // 단위: 데시미터
  weight: number;       // 단위: 헥토그램
  stats: { name: string; value: number }[];
  description: string;  // 한국어 도감 설명
  evolutionChain?: EvolutionStage[];
}

export interface EvolutionStage {
  id: number;
  koreanName: string;
  imageUrl: string;
}

// PokeAPI 응답 타입
export interface PokeAPIListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: { name: string; url: string }[];
}

export interface PokeAPIPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: { name: string; url: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  sprites: {
    other: {
      "official-artwork": { front_default: string };
    };
  };
}

export interface PokeAPISpecies {
  names: { language: { name: string }; name: string }[];
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
    version: { name: string };
  }[];
  evolution_chain: { url: string };
}

export interface PokeAPIType {
  names: { language: { name: string }; name: string }[];
}
