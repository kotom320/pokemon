import type {
  PokeAPIListResponse,
  PokeAPIPokemon,
  PokeAPISpecies,
  PokeAPIType,
  PokemonListItem,
  PokemonDetail,
  AlternateForm,
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
  const [listRes, speciesRes] = await Promise.all([
    fetch(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`, {
      next: { revalidate: 3600 },
    }),
    fetch(`${BASE_URL}/pokemon-species?limit=1`, {
      next: { revalidate: 86400 },
    }),
  ]);
  const list: PokeAPIListResponse = await listRes.json();
  const speciesMeta: { count: number } = await speciesRes.json();

  const results = await Promise.allSettled(
    list.results.map(async (entry) => {
      const id = extractIdFromUrl(entry.url);
      return getPokemonListItem(id);
    })
  );

  const items = results
    .filter((r): r is PromiseFulfilledResult<PokemonListItem> => r.status === "fulfilled")
    .map((r) => r.value);

  return { items, total: speciesMeta.count };
}

export async function getPokemonListItem(id: number): Promise<PokemonListItem> {
  const pokemon = await fetchPokemon(id);
  const species = await fetchSpecies(pokemon.species.url);

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
  const pokemon = await fetchPokemon(id);
  const species = await fetchSpecies(pokemon.species.url);

  const baseKoreanName =
    species.names.find((n) => n.language.name === "ko")?.name ?? pokemon.name;

  const defaultVariety = species.varieties.find((v) => v.is_default);
  const isDefault = defaultVariety?.pokemon.name === pokemon.name;
  const displayId = isDefault ? id : extractIdFromUrl(defaultVariety?.pokemon.url ?? String(id));
  const koreanName = isDefault
    ? baseKoreanName
    : getKoreanFormName(pokemon.name, baseKoreanName);

  const types = await Promise.all(
    pokemon.types.map((t) => getKoreanTypeName(t.type.name))
  );

  const description = getKoreanDescription(species.flavor_text_entries, pokemon.name);

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

  const alternateForms = await getAlternateForms(species, baseKoreanName, id);

  return {
    id,
    displayId,
    name: pokemon.name,
    koreanName,
    imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    types,
    height: pokemon.height,
    weight: pokemon.weight,
    stats,
    description,
    alternateForms,
  };
}

async function fetchPokemon(id: number): Promise<PokeAPIPokemon> {
  const res = await fetch(`${BASE_URL}/pokemon/${id}`, {
    next: { revalidate: 86400 },
  });
  return res.json();
}

async function fetchSpecies(urlOrId: string | number): Promise<PokeAPISpecies> {
  const url = typeof urlOrId === "number"
    ? `${BASE_URL}/pokemon-species/${urlOrId}`
    : urlOrId;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  return res.json();
}

function extractIdFromUrl(url: string): number {
  const parts = url.split("/").filter(Boolean);
  return Number(parts[parts.length - 1]);
}

// 지역 폼의 설명이 실린 게임 버전 목록
const REGIONAL_VERSIONS: { match: string; versions: string[] }[] = [
  { match: "-alola", versions: ["sun", "moon", "ultra-sun", "ultra-moon"] },
  { match: "-galar", versions: ["sword", "shield"] },
  { match: "-hisui", versions: ["legends-arceus"] },
  { match: "-paldea", versions: ["scarlet", "violet"] },
];

type FlavorTextEntry = PokeAPISpecies["flavor_text_entries"][number];

function getKoreanDescription(entries: FlavorTextEntry[], slug: string): string {
  const koEntries = entries.filter((e) => e.language.name === "ko");
  if (koEntries.length === 0) return "";

  const regional = REGIONAL_VERSIONS.find((r) => slug.includes(r.match));
  if (regional) {
    const match = koEntries.find((e) => regional.versions.includes(e.version.name));
    if (match) return match.flavor_text.replace(/\f/g, " ");
  }

  return koEntries[koEntries.length - 1].flavor_text.replace(/\f/g, " ");
}

function isRelevantForm(slug: string): boolean {
  return (
    slug.includes("-mega") ||
    slug.endsWith("-gmax") ||
    slug.includes("-alola") ||
    slug.includes("-galar") ||
    slug.includes("-hisui") ||
    slug.includes("-paldea")
  );
}

function getKoreanFormName(slug: string, baseKoreanName: string): string {
  if (slug.endsWith("-gmax")) return `거대이맥스 ${baseKoreanName}`;
  if (slug.endsWith("-mega-x")) return `메가 ${baseKoreanName} X`;
  if (slug.endsWith("-mega-y")) return `메가 ${baseKoreanName} Y`;
  if (slug.endsWith("-mega")) return `메가 ${baseKoreanName}`;
  if (slug.includes("-alola")) return `알로라의 모습`;
  if (slug.includes("-galar")) return `가라르의 모습`;
  if (slug.includes("-hisui")) return `히스이의 모습`;
  if (slug.includes("-paldea")) return `팔데아의 모습`;
  return slug;
}

async function getAlternateForms(
  species: PokeAPISpecies,
  baseKoreanName: string,
  currentId: number,
): Promise<AlternateForm[]> {
  // 기본 폼 + 메가/거대이맥스/지역 폼만 포함
  const relevant = species.varieties.filter(
    (v) => v.is_default || isRelevantForm(v.pokemon.name)
  );
  if (relevant.length <= 1) return [];

  const results = await Promise.allSettled(
    relevant.map(async (v) => {
      const res = await fetch(`${BASE_URL}/pokemon/${v.pokemon.name}`, {
        next: { revalidate: 86400 },
      });
      const pokemon: PokeAPIPokemon = await res.json();
      return {
        id: pokemon.id,
        slug: v.pokemon.name,
        koreanName: v.is_default
          ? baseKoreanName
          : getKoreanFormName(v.pokemon.name, baseKoreanName),
        imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<AlternateForm> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((form) => form.id !== currentId); // 현재 폼 제외
}
