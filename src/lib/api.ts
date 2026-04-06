import type {
  PokeAPIListResponse,
  PokeAPIPokemon,
  PokeAPISpecies,
  PokeAPIType,
  PokemonListItem,
  PokemonDetail,
  AlternateForm,
  EvolutionNode,
  PrintEntry,
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
  const listRes = await fetch(
    `${BASE_URL}/pokemon-species?limit=${limit}&offset=${offset}`,
    { next: { revalidate: 3600 } }
  );
  const list: PokeAPIListResponse = await listRes.json();

  const results = await Promise.allSettled(
    list.results.map(async (entry) => {
      const id = extractIdFromUrl(entry.url);
      return getPokemonListItem(id);
    })
  );

  const items = results
    .filter((r): r is PromiseFulfilledResult<PokemonListItem> => r.status === "fulfilled")
    .map((r) => r.value);

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
  const pokemon = await fetchPokemon(id);
  const species = await fetchSpecies(pokemon.species.url);

  const baseKoreanName =
    species.names.find((n) => n.language.name === "ko")?.name ?? pokemon.name;

  const defaultVariety = species.varieties.find((v) => v.is_default);
  const isDefault = defaultVariety?.pokemon.name === pokemon.name;
  const displayId = isDefault ? id : extractIdFromUrl(defaultVariety?.pokemon.url ?? String(id));

  let koreanName = baseKoreanName;
  if (!isDefault) {
    const formRes = await fetch(`${BASE_URL}/pokemon-form/${pokemon.name}`, {
      next: { revalidate: 86400 },
    });
    const formData: { form_names: { language: { name: string }; name: string }[] } = await formRes.json();
    const koreanFormName = formData.form_names.find((n) => n.language.name === "ko")?.name;
    koreanName = koreanFormName || getKoreanFormName(pokemon.name, baseKoreanName);
  }

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

  const [alternateForms, evolutionChain] = await Promise.all([
    getAlternateForms(species, baseKoreanName, id),
    getEvolutionChain(species.evolution_chain.url),
  ]);

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
    evolutionChain,
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

  const regional = REGIONAL_VERSIONS.find((r) => slug.endsWith(r.match));
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
    slug.endsWith("-alola") ||
    slug.endsWith("-galar") ||
    slug.endsWith("-hisui") ||
    slug.endsWith("-paldea")
  );
}

// 이벤트/코스튬 한정 폼 — 도감에서 제외
function isExcludedForm(slug: string): boolean {
  return (
    slug.endsWith("-cap") ||        // 피카츄 모자 시리즈
    slug.endsWith("-cosplay") ||    // 피카츄 코스프레
    slug.endsWith("-starter") ||    // 피카츄 스타터
    slug.endsWith("-rock-star") ||  // 피카츄 코스튬
    slug.endsWith("-belle") ||
    slug.endsWith("-pop-star") ||
    slug.endsWith("-phd") ||
    slug.endsWith("-libre")
  );
}

function getKoreanFormName(slug: string, baseKoreanName: string): string {
  if (slug.endsWith("-gmax")) return `거대이맥스 ${baseKoreanName}`;
  if (slug.endsWith("-mega-x")) return `메가 ${baseKoreanName} X`;
  if (slug.endsWith("-mega-y")) return `메가 ${baseKoreanName} Y`;
  if (slug.endsWith("-mega")) return `메가 ${baseKoreanName}`;
  if (slug.endsWith("-alola")) return `알로라의 모습`;
  if (slug.endsWith("-galar")) return `가라르의 모습`;
  if (slug.endsWith("-hisui")) return `히스이의 모습`;
  if (slug.endsWith("-paldea")) return `팔데아의 모습`;
  return slug;
}

async function getAlternateForms(
  species: PokeAPISpecies,
  baseKoreanName: string,
  currentId: number,
): Promise<AlternateForm[]> {
  const varieties = species.varieties.filter(
    (v) => v.is_default || !isExcludedForm(v.pokemon.name)
  );
  if (varieties.length <= 1) return [];

  const results = await Promise.allSettled(
    varieties.map(async (v) => {
      const [pokemonRes, formRes] = await Promise.all([
        fetch(`${BASE_URL}/pokemon/${v.pokemon.name}`, { next: { revalidate: 86400 } }),
        fetch(`${BASE_URL}/pokemon-form/${v.pokemon.name}`, { next: { revalidate: 86400 } }),
      ]);
      const pokemon: PokeAPIPokemon = await pokemonRes.json();
      const form: { form_names: { language: { name: string }; name: string }[] } = await formRes.json();

      const koreanFormName = form.form_names.find((n) => n.language.name === "ko")?.name;
      const koreanName = v.is_default
        ? baseKoreanName
        : (koreanFormName || getKoreanFormName(v.pokemon.name, baseKoreanName));

      return {
        id: pokemon.id,
        slug: v.pokemon.name,
        koreanName,
        imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<AlternateForm> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((form) => form.id !== currentId);
}

interface PokeAPIEvolutionLink {
  species: { name: string; url: string };
  evolves_to: PokeAPIEvolutionLink[];
}

async function buildEvolutionNode(link: PokeAPIEvolutionLink): Promise<EvolutionNode> {
  const speciesId = extractIdFromUrl(link.species.url);
  const species = await fetchSpecies(speciesId);
  const koreanName = species.names.find((n) => n.language.name === "ko")?.name ?? link.species.name;
  const evolvesTo = await Promise.all(link.evolves_to.map(buildEvolutionNode));
  return {
    id: speciesId,
    koreanName,
    imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${speciesId}.png`,
    evolvesTo,
  };
}

async function getEvolutionChain(url: string): Promise<EvolutionNode> {
  const res = await fetch(url, { next: { revalidate: 86400 } });
  const data: { chain: PokeAPIEvolutionLink } = await res.json();
  return buildEvolutionNode(data.chain);
}

export async function getAllPokemonForPrint(): Promise<PrintEntry[]> {
  // 전체 species 목록 (URL만)
  const res = await fetch(`${BASE_URL}/pokemon-species?limit=1025&offset=0`, {
    next: { revalidate: 86400 },
  });
  const list: { results: { name: string; url: string }[] } = await res.json();

  // 50개씩 배치로 species 상세 조회
  const BATCH = 50;
  const entries: PrintEntry[] = [];

  for (let i = 0; i < list.results.length; i += BATCH) {
    const batch = list.results.slice(i, i + BATCH);
    const details = await Promise.all(
      batch.map((s) =>
        fetch(s.url, { next: { revalidate: 86400 } }).then((r) => r.json() as Promise<PokeAPISpecies & { id: number }>)
      )
    );

    for (const species of details) {
      const displayId: number = (species as unknown as { id: number }).id;
      const koreanName =
        (species as unknown as PokeAPISpecies).names.find((n) => n.language.name === "ko")?.name ?? "";
      if (!koreanName) continue;

      entries.push({ displayId, koreanName, isForm: false });

      // 폼 추가 (slug만으로 이름 생성 — 추가 API 호출 없음)
      const forms = (species as unknown as PokeAPISpecies).varieties.filter(
        (v) => !v.is_default && isRelevantForm(v.pokemon.name)
      );
      for (const form of forms) {
        entries.push({
          displayId,
          koreanName: getKoreanFormName(form.pokemon.name, koreanName),
          isForm: true,
        });
      }
    }
  }

  return entries.sort((a, b) => a.displayId - b.displayId);
}
