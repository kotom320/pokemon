/**
 * Supabase 포켓몬 시드 스크립트
 * 실행: node scripts/seed-supabase.mjs
 *
 * 환경변수 필요:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
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
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
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
        });
      } catch (e) {
        console.warn(`  ⚠️  ${id}번 실패: ${e.message}`);
      }
    })
  );
  return rows;
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

  console.log(`\n\n✅ 완료! 총 ${allRows.length}마리 저장됨`);
}

main().catch((e) => {
  console.error("❌ 오류:", e);
  process.exit(1);
});
