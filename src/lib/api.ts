import type {
  PokeAPIListResponse,
  PokeAPIPokemon,
  PokeAPISpecies,
  PokeAPIType,
  PokemonListItem,
  PokemonDetail,
} from "./types";

const BASE_URL = "https://pokeapi.co/api/v2";

// 타입명 한국어 캐시
const typeNameCache = new Map<string, string>();

async function getKoreanTypeName(typeName: string): Promise<string> {
  if (typeNameCache.has(typeName)) return typeNameCache.get(typeName)!;

  const res = await fetch(`${BASE_URL}/type/${typeName}`, {
    next: { revalidate: 86400 }, // 24시간 캐시
  });
  const data: PokeAPIType = await res.json();
  const korean = data.names.find((n) => n.language.name === "ko")?.name ?? typeName;
  typeNameCache.set(typeName, korean);
  return korean;
}

export async function getPokemonList(
  limit: number = 20,
  offset: number = 0
): Promise<{ items: PokemonListItem[]; total: number }> {
  const res = await fetch(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`, {
    next: { revalidate: 3600 },
  });
  const list: PokeAPIListResponse = await res.json();

  const items = await Promise.all(
    list.results.map(async (entry) => {
      const id = extractIdFromUrl(entry.url);
      return getPokemonListItem(id);
    })
  );

  return { items, total: list.count };
}

export async function getPokemonListItem(id: number): Promise<PokemonListItem> {
  const [pokemon, species] = await Promise.all([
    fetchPokemon(id),
    fetchSpecies(id),
  ]);

  const koreanName =
    species.names.find((n) => n.language.name === "ko")?.name ?? pokemon.name;

  const types = await Promise.all(
    pokemon.types.map((t) => getKoreanTypeName(t.type.name))
  );

  return {
    id,
    name: pokemon.name,
    koreanName,
    imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    types,
  };
}

export async function getPokemonDetail(id: number): Promise<PokemonDetail> {
  const [pokemon, species] = await Promise.all([
    fetchPokemon(id),
    fetchSpecies(id),
  ]);

  const koreanName =
    species.names.find((n) => n.language.name === "ko")?.name ?? pokemon.name;

  const types = await Promise.all(
    pokemon.types.map((t) => getKoreanTypeName(t.type.name))
  );

  const description =
    species.flavor_text_entries
      .find((e) => e.language.name === "ko")
      ?.flavor_text.replace(/\f/g, " ") ?? "";

  const statNameMap: Record<string, string> = {
    hp: "HP",
    attack: "공격",
    defense: "방어",
    "special-attack": "특수공격",
    "special-defense": "특수방어",
    speed: "스피드",
  };

  const stats = pokemon.stats.map((s) => ({
    name: statNameMap[s.stat.name] ?? s.stat.name,
    value: s.base_stat,
  }));

  return {
    id,
    name: pokemon.name,
    koreanName,
    imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    types,
    height: pokemon.height,
    weight: pokemon.weight,
    stats,
    description,
  };
}

async function fetchPokemon(id: number): Promise<PokeAPIPokemon> {
  const res = await fetch(`${BASE_URL}/pokemon/${id}`, {
    next: { revalidate: 86400 },
  });
  return res.json();
}

async function fetchSpecies(id: number): Promise<PokeAPISpecies> {
  const res = await fetch(`${BASE_URL}/pokemon-species/${id}`, {
    next: { revalidate: 86400 },
  });
  return res.json();
}

function extractIdFromUrl(url: string): number {
  const parts = url.split("/").filter(Boolean);
  return Number(parts[parts.length - 1]);
}
