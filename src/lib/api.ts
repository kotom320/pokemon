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
import { TYPE_KO_TO_EN } from "./types";

const BASE_URL = "https://pokeapi.co/api/v2";

export const GENERATION_RANGES: Record<number, { start: number; end: number }> = {
  1: { start: 1,   end: 151  },
  2: { start: 152, end: 251  },
  3: { start: 252, end: 386  },
  4: { start: 387, end: 493  },
  5: { start: 494, end: 649  },
  6: { start: 650, end: 721  },
  7: { start: 722, end: 809  },
  8: { start: 810, end: 905  },
  9: { start: 906, end: 1025 },
};

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
  offset: number = 0,
  generation?: number,
  type?: string,
): Promise<{ items: PokemonListItem[]; total: number }> {
  let ids: number[];
  let total: number;

  if (type) {
    const typeEn = TYPE_KO_TO_EN[type];
    if (!typeEn) return { items: [], total: 0 };
    const res = await fetch(`${BASE_URL}/type/${typeEn}`, { next: { revalidate: 86400 } });
    const data: PokeAPIType = await res.json();
    let allIds = data.pokemon
      .map((p) => extractIdFromUrl(p.pokemon.url))
      .filter((id) => id >= 1 && id <= 1025)
      .sort((a, b) => a - b);
    // 세대 AND 조건
    if (generation && GENERATION_RANGES[generation]) {
      const { start, end } = GENERATION_RANGES[generation];
      allIds = allIds.filter((id) => id >= start && id <= end);
    }
    total = allIds.length;
    ids = allIds.slice(offset, offset + limit);
  } else if (generation) {
    const { start, end } = GENERATION_RANGES[generation];
    total = end - start + 1;
    ids = Array.from(
      { length: Math.min(limit, total - offset) },
      (_, i) => start + offset + i
    );
  } else {
    const listRes = await fetch(
      `${BASE_URL}/pokemon-species?limit=${limit}&offset=${offset}`,
      { next: { revalidate: 3600 } }
    );
    const list: PokeAPIListResponse = await listRes.json();
    total = list.count;
    ids = list.results.map((e) => extractIdFromUrl(e.url));
  }

  const results = await Promise.allSettled(ids.map((id) => getPokemonListItem(id)));
  const items = results
    .filter((r): r is PromiseFulfilledResult<PokemonListItem> => r.status === "fulfilled")
    .map((r) => r.value);

  return { items, total };
}

// 검색용 이름 캐시 (서버 메모리에 유지)
let searchCache: { id: number; koreanName: string }[] | null = null;

export async function searchPokemon(query: string): Promise<PokemonListItem[]> {
  if (!query.trim()) return [];

  if (!searchCache) {
    const res = await fetch(`${BASE_URL}/pokemon-species?limit=1025`, {
      next: { revalidate: 86400 },
    });
    const list: { results: { name: string; url: string }[] } = await res.json();

    const BATCH = 50;
    const cache: { id: number; koreanName: string }[] = [];
    for (let i = 0; i < list.results.length; i += BATCH) {
      const batch = list.results.slice(i, i + BATCH);
      const details = await Promise.all(
        batch.map((s) => fetch(s.url, { next: { revalidate: 86400 } }).then((r) => r.json()))
      );
      for (const s of details) {
        const korean = s.names?.find((n: { language: { name: string }; name: string }) => n.language.name === "ko")?.name;
        if (korean) cache.push({ id: s.id, koreanName: korean });
      }
    }
    searchCache = cache;
  }

  const q = query.trim().toLowerCase();
  const matched = searchCache.filter(
    (p) =>
      p.koreanName.includes(query.trim()) ||
      String(p.id).padStart(3, "0").startsWith(q)
  );

  const results = await Promise.allSettled(matched.slice(0, 40).map((p) => getPokemonListItem(p.id)));
  return results
    .filter((r): r is PromiseFulfilledResult<PokemonListItem> => r.status === "fulfilled")
    .map((r) => r.value);
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
    // 메가진화 / 거다이맥스
    slug.includes("-mega") ||
    slug.endsWith("-gmax") ||
    slug.endsWith("-eternamax") ||
    // 지역 폼
    slug.endsWith("-alola") ||
    slug.endsWith("-galar") ||
    slug.endsWith("-hisui") ||
    slug.endsWith("-paldea") ||
    // 주요 폼 변경 (다른 스탯/타입을 가지는 폼들)
    slug.endsWith("-origin") ||
    slug.endsWith("-sky") ||
    slug.endsWith("-therian") ||
    slug.endsWith("-black") ||
    slug.endsWith("-white") ||
    slug.endsWith("-resolute") ||
    slug.endsWith("-crowned") ||
    slug.endsWith("-hero") ||
    slug.endsWith("-zero") ||
    slug.endsWith("-terastal") ||
    slug.endsWith("-stellar")
  );
}

// 도감에서 제외할 폼
function isExcludedForm(slug: string): boolean {
  return (
    // 피카츄 이벤트/코스튬 시리즈
    slug.endsWith("-cap") ||
    slug.endsWith("-cosplay") ||
    slug.endsWith("-starter") ||
    slug.endsWith("-rock-star") ||
    slug.endsWith("-belle") ||
    slug.endsWith("-pop-star") ||
    slug.endsWith("-phd") ||
    slug.endsWith("-libre") ||
    // 토템 포켓몬 (알로라 보스 전용 초대형)
    slug.endsWith("-totem") ||
    // 언논 (알파벳 28종 — 외형만 다름)
    /^unown-/.test(slug) ||
    // 알크레이드 장식 폼 (수십 가지 — 외형만 다름)
    /^alcremie-/.test(slug) ||
    // 비비용 날개 무늬 폼 (18종 — 외형만 다름)
    /^vivillon-/.test(slug) ||
    // 스프링 날개무늬도 동일
    /^spewpa-/.test(slug)
  );
}

function getKoreanFormName(slug: string, baseKoreanName: string): string {
  if (slug.endsWith("-gmax")) return `거다이맥스 ${baseKoreanName}`;
  if (slug.endsWith("-mega-x")) return `메가 ${baseKoreanName} X`;
  if (slug.endsWith("-mega-y")) return `메가 ${baseKoreanName} Y`;
  if (slug.endsWith("-mega")) return `메가 ${baseKoreanName}`;
  if (slug.endsWith("-alola")) return `알로라의 모습`;
  if (slug.endsWith("-galar")) return `가라르의 모습`;
  if (slug.endsWith("-hisui")) return `히스이의 모습`;
  if (slug.endsWith("-paldea")) return `팔데아의 모습`;
  if (slug.endsWith("-hero")) return `마이티 폼`;
  if (slug.endsWith("-zero")) return `제로 폼`;
  if (slug.endsWith("-origin")) return `오리진 폼`;
  if (slug.endsWith("-sky")) return `스카이 폼`;
  if (slug.endsWith("-therian")) return `영물 폼`;
  if (slug.endsWith("-black")) return `블랙 폼`;
  if (slug.endsWith("-white")) return `화이트 폼`;
  if (slug.endsWith("-resolute")) return `기개 폼`;
  if (slug.endsWith("-crowned")) return `왕관 폼`;
  if (slug.endsWith("-eternamax")) return `이터나맥스 ${baseKoreanName}`;
  if (slug.endsWith("-terastal")) return `테라스탈 폼`;
  if (slug.endsWith("-stellar")) return `스텔라 폼`;
  if (slug.endsWith("-normal")) return `노말 폼`;
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

      const imageUrl = pokemon.sprites.other["official-artwork"].front_default;
      if (!imageUrl) return null; // artwork 없는 폼 제외

      return {
        id: pokemon.id,
        slug: v.pokemon.name,
        koreanName,
        imageUrl,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<AlternateForm | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((form): form is AlternateForm => form !== null && form.id !== currentId);
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
