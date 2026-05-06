/**
 * Supabase 포켓몬 시드 스크립트
 * 실행: node scripts/seed-supabase.mjs
 *
 * 환경변수 필요:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (쓰기 권한, RLS 우회)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// .env.local 수동 파싱
const envPath = resolve(process.cwd(), ".env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
for (const line of envLines) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = "https://pokeapi.co/api/v2";

const GENERATION_RANGES = {
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

const TYPE_KO = {
  normal: "노말", fire: "불꽃", water: "물", grass: "풀",
  electric: "전기", ice: "얼음", fighting: "격투", poison: "독",
  ground: "땅", flying: "비행", psychic: "에스퍼", bug: "벌레",
  rock: "바위", ghost: "고스트", dragon: "드래곤", dark: "악",
  steel: "강철", fairy: "페어리",
};

function getGeneration(id) {
  for (const [gen, { start, end }] of Object.entries(GENERATION_RANGES)) {
    if (id >= start && id <= end) return Number(gen);
  }
  return 9;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function isRelevantForm(slug) {
  return (
    slug.includes("-mega") ||
    slug.endsWith("-gmax") ||
    slug.endsWith("-eternamax") ||
    slug.endsWith("-alola") ||
    slug.endsWith("-galar") ||
    slug.endsWith("-hisui") ||
    slug.endsWith("-paldea") ||
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

function isExcludedForm(slug) {
  return (
    slug.endsWith("-cap") ||
    slug.endsWith("-cosplay") ||
    slug.endsWith("-starter") ||
    slug.endsWith("-rock-star") ||
    slug.endsWith("-belle") ||
    slug.endsWith("-pop-star") ||
    slug.endsWith("-phd") ||
    slug.endsWith("-libre") ||
    slug.endsWith("-totem") ||
    /^unown-/.test(slug) ||
    /^alcremie-/.test(slug) ||
    /^vivillon-/.test(slug) ||
    /^spewpa-/.test(slug)
  );
}

function getKoreanFormName(slug, baseKoreanName) {
  if (slug.endsWith("-gmax")) return `거다이맥스 ${baseKoreanName}`;
  if (slug.endsWith("-mega-x")) return `메가 ${baseKoreanName} X`;
  if (slug.endsWith("-mega-y")) return `메가 ${baseKoreanName} Y`;
  if (slug.endsWith("-mega")) return `메가 ${baseKoreanName}`;
  if (slug.endsWith("-alola")) return `알로라의 모습 ${baseKoreanName}`;
  if (slug.endsWith("-galar")) return `가라르의 모습 ${baseKoreanName}`;
  if (slug.endsWith("-hisui")) return `히스이의 모습 ${baseKoreanName}`;
  if (slug.endsWith("-paldea")) return `팔데아의 모습 ${baseKoreanName}`;
  if (slug.endsWith("-hero")) return `마이티 폼 ${baseKoreanName}`;
  if (slug.endsWith("-zero")) return `제로 폼 ${baseKoreanName}`;
  if (slug.endsWith("-origin")) return `오리진 폼 ${baseKoreanName}`;
  if (slug.endsWith("-sky")) return `스카이 폼 ${baseKoreanName}`;
  if (slug.endsWith("-therian")) return `영물 폼 ${baseKoreanName}`;
  if (slug.endsWith("-black")) return `블랙 폼 ${baseKoreanName}`;
  if (slug.endsWith("-white")) return `화이트 폼 ${baseKoreanName}`;
  if (slug.endsWith("-resolute")) return `기개 폼 ${baseKoreanName}`;
  if (slug.endsWith("-crowned")) return `왕관 폼 ${baseKoreanName}`;
  if (slug.endsWith("-eternamax")) return `이터나맥스 ${baseKoreanName}`;
  if (slug.endsWith("-terastal")) return `테라스탈 폼 ${baseKoreanName}`;
  if (slug.endsWith("-stellar")) return `스텔라 폼 ${baseKoreanName}`;
  return slug;
}

async function processBatch(ids) {
  const rows = [];
  await Promise.allSettled(
    ids.map(async (id) => {
      try {
        const [pokemon, species] = await Promise.all([
          fetchJson(`${BASE_URL}/pokemon/${id}`),
          fetchJson(`${BASE_URL}/pokemon-species/${id}`),
        ]);
        const koreanName = species.names.find((n) => n.language.name === "ko")?.name;
        if (!koreanName) return;

        const types = pokemon.types.map((t) => TYPE_KO[t.type.name] ?? t.type.name);
        rows.push({
          id,
          name: pokemon.name,
          korean_name: koreanName,
          image_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
          types,
          generation: getGeneration(id),
          base_id: null,
          sort_id: id,
        });
      } catch (e) {
        console.warn(`  ⚠️  ${id}번 실패: ${e.message}`);
      }
    })
  );
  return rows;
}

async function seedForms() {
  console.log("\n🔄 폼 시딩 시작...\n");

  // 모든 species 목록 가져오기
  const list = await fetchJson(`${BASE_URL}/pokemon-species?limit=1025`);
  const BATCH = 20;
  let formCount = 0;

  for (let i = 0; i < list.results.length; i += BATCH) {
    const batch = list.results.slice(i, i + BATCH);
    const speciesList = await Promise.all(
      batch.map((s) => fetchJson(s.url))
    );

    const rows = [];
    await Promise.allSettled(
      speciesList.map(async (species) => {
        const baseId = species.id;
        const baseKoreanName = species.names.find((n) => n.language.name === "ko")?.name;
        if (!baseKoreanName) return;

        const formVarieties = species.varieties.filter(
          (v) => !v.is_default && isRelevantForm(v.pokemon.name) && !isExcludedForm(v.pokemon.name)
        );
        if (formVarieties.length === 0) return;

        await Promise.allSettled(
          formVarieties.map(async (v) => {
            try {
              const [pokemon, form] = await Promise.all([
                fetchJson(`${BASE_URL}/pokemon/${v.pokemon.name}`),
                fetchJson(`${BASE_URL}/pokemon-form/${v.pokemon.name}`),
              ]);

              const imageUrl = pokemon.sprites?.other?.["official-artwork"]?.front_default;
              if (!imageUrl) return;

              const koreanFormName =
                form.form_names?.find((n) => n.language.name === "ko")?.name ||
                getKoreanFormName(v.pokemon.name, baseKoreanName);

              const types = pokemon.types.map((t) => TYPE_KO[t.type.name] ?? t.type.name);
              rows.push({
                id: pokemon.id,
                name: pokemon.name,
                korean_name: koreanFormName,
                image_url: imageUrl,
                types,
                generation: getGeneration(baseId),
                base_id: baseId,
                sort_id: baseId,
              });
            } catch (e) {
              console.warn(`  ⚠️  ${v.pokemon.name} 폼 실패: ${e.message}`);
            }
          })
        );
      })
    );

    if (rows.length > 0) {
      const { error } = await supabase.from("pokemon").upsert(rows, { onConflict: "id" });
      if (error) {
        console.error(`\n❌ 폼 저장 오류:`, error.message);
      } else {
        formCount += rows.length;
        process.stdout.write(`  폼 저장: ${formCount}개...\r`);
      }
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✅ 폼 시딩 완료! 총 ${formCount}개 저장됨`);
}

async function main() {
  console.log("🚀 Supabase 포켓몬 시드 시작...\n");

  const TOTAL = 1025;
  const BATCH = 20;
  const allRows = [];

  for (let i = 1; i <= TOTAL; i += BATCH) {
    const ids = Array.from({ length: Math.min(BATCH, TOTAL - i + 1) }, (_, j) => i + j);
    process.stdout.write(`  진행: ${i}~${ids[ids.length - 1]} / ${TOTAL}...\r`);

    const rows = await processBatch(ids);
    allRows.push(...rows);

    // Supabase에 즉시 저장 (upsert)
    if (rows.length > 0) {
      const { error } = await supabase.from("pokemon").upsert(rows, { onConflict: "id" });
      if (error) {
        console.error(`\n❌ Supabase 저장 오류 (${i}~${ids[ids.length-1]}):`, error.message);
      }
    }

    // PokeAPI 속도 제한 대비
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n\n✅ 기본 포켓몬 완료! 총 ${allRows.length}마리 저장됨`);

  await seedForms();
}

main().catch((e) => {
  console.error("❌ 오류:", e);
  process.exit(1);
});
