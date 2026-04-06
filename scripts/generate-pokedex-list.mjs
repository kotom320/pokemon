/**
 * 포켓몬 도감 목록 이미지 생성 스크립트
 * 실행: node scripts/generate-pokedex-list.mjs
 * 출력: output/pokedex-page-1.png, pokedex-page-2.png, ...
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://pokeapi.co/api/v2";

// A4 @ 150dpi
const PAGE_W = 1240;
const PAGE_H = 1754;
const MARGIN = 60;
const COLS = 5;
const COL_W = (PAGE_W - MARGIN * 2) / COLS;
const ROW_H = 22;
const HEADER_H = 80;
const ROWS_PER_COL = Math.floor((PAGE_H - MARGIN * 2 - HEADER_H) / ROW_H);
const ENTRIES_PER_PAGE = COLS * ROWS_PER_COL;

// 한국어 폰트 로드 (시스템에 없으면 fallback)
function loadFont() {
  const candidates = [
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
  ];
  for (const p of candidates) {
    try {
      return readFileSync(p);
    } catch {}
  }
  throw new Error(
    "한국어 폰트를 찾을 수 없습니다.\n" +
    "다음 경로 중 하나에 폰트 파일을 두세요:\n" +
    candidates.join("\n")
  );
}

// PokeAPI 호출
async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

function isRelevantForm(slug) {
  return (
    slug.includes("-mega") ||
    slug.endsWith("-gmax") ||
    slug.endsWith("-alola") ||
    slug.endsWith("-galar") ||
    slug.endsWith("-hisui") ||
    slug.endsWith("-paldea")
  );
}

function getKoreanFormName(slug, baseName) {
  if (slug.endsWith("-gmax")) return `거대이맥스 ${baseName}`;
  if (slug.endsWith("-mega-x")) return `메가 ${baseName} X`;
  if (slug.endsWith("-mega-y")) return `메가 ${baseName} Y`;
  if (slug.endsWith("-mega")) return `메가 ${baseName}`;
  if (slug.endsWith("-alola")) return `알로라의 모습`;
  if (slug.endsWith("-galar")) return `가라르의 모습`;
  if (slug.endsWith("-hisui")) return `히스이의 모습`;
  if (slug.endsWith("-paldea")) return `팔데아의 모습`;
  return slug;
}

async function fetchAllEntries() {
  console.log("📡 전체 포켓몬 species 목록 가져오는 중...");
  const list = await fetchJson(`${BASE_URL}/pokemon-species?limit=1025&offset=0`);

  const entries = [];
  const BATCH = 30;

  for (let i = 0; i < list.results.length; i += BATCH) {
    const batch = list.results.slice(i, i + BATCH);
    const details = await Promise.all(batch.map((s) => fetchJson(s.url)));

    for (const species of details) {
      const koreanName = species.names.find((n) => n.language.name === "ko")?.name;
      if (!koreanName) continue;

      entries.push({ displayId: species.id, koreanName, isForm: false });

      const forms = species.varieties.filter(
        (v) => !v.is_default && isRelevantForm(v.pokemon.name)
      );
      for (const form of forms) {
        entries.push({
          displayId: species.id,
          koreanName: getKoreanFormName(form.pokemon.name, koreanName),
          isForm: true,
        });
      }
    }

    const pct = Math.min(100, Math.round(((i + BATCH) / list.results.length) * 100));
    process.stdout.write(`\r  진행: ${pct}% (${Math.min(i + BATCH, list.results.length)}/${list.results.length})`);
  }
  console.log("\n✅ 데이터 로드 완료:", entries.length, "개");
  return entries.sort((a, b) => a.displayId - b.displayId);
}

function buildPageJsx(pageEntries, pageNum, totalPages, font) {
  const columns = Array.from({ length: COLS }, (_, ci) =>
    pageEntries.slice(ci * ROWS_PER_COL, (ci + 1) * ROWS_PER_COL)
  );

  return {
    type: "div",
    props: {
      style: {
        width: PAGE_W,
        height: PAGE_H,
        background: "#ffffff",
        fontFamily: "Korean",
        display: "flex",
        flexDirection: "column",
        padding: MARGIN,
      },
      children: [
        // 헤더
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 24,
              borderBottom: "2px solid #e5e7eb",
              paddingBottom: 12,
            },
            children: [
              {
                type: "span",
                props: {
                  style: { fontSize: 28, fontWeight: "bold", color: "#111827" },
                  children: "포켓몬 도감",
                },
              },
              {
                type: "span",
                props: {
                  style: { fontSize: 14, color: "#6b7280" },
                  children: `${pageNum} / ${totalPages}`,
                },
              },
            ],
          },
        },
        // 컬럼 그리드
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flex: 1,
              gap: 8,
            },
            children: columns.map((colEntries, ci) => ({
              type: "div",
              props: {
                key: ci,
                style: {
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                },
                children: colEntries.map((entry, ri) => ({
                  type: "div",
                  props: {
                    key: ri,
                    style: {
                      display: "flex",
                      alignItems: "baseline",
                      gap: 6,
                      height: ROW_H,
                      paddingLeft: entry.isForm ? 10 : 0,
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            fontSize: 10,
                            color: "#9ca3af",
                            fontVariantNumeric: "tabular-nums",
                            minWidth: 28,
                          },
                          children: String(entry.displayId).padStart(3, "0"),
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            fontSize: entry.isForm ? 11 : 13,
                            color: entry.isForm ? "#9ca3af" : "#111827",
                            fontWeight: entry.isForm ? "normal" : "bold",
                          },
                          children: entry.koreanName,
                        },
                      },
                    ],
                  },
                })),
              },
            })),
          },
        },
      ],
    },
  };
}

async function main() {
  const font = loadFont();
  const entries = await fetchAllEntries();
  const totalPages = Math.ceil(entries.length / ENTRIES_PER_PAGE);

  const outDir = join(__dirname, "../output");
  mkdirSync(outDir, { recursive: true });

  console.log(`\n🖼  총 ${totalPages}장 이미지 생성 중...`);

  for (let page = 1; page <= totalPages; page++) {
    const pageEntries = entries.slice(
      (page - 1) * ENTRIES_PER_PAGE,
      page * ENTRIES_PER_PAGE
    );

    const jsx = buildPageJsx(pageEntries, page, totalPages, font);

    const svg = await satori(jsx, {
      width: PAGE_W,
      height: PAGE_H,
      fonts: [{ name: "Korean", data: font, weight: 400, style: "normal" }],
    });

    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: PAGE_W } });
    const png = resvg.render().asPng();

    const outPath = join(outDir, `pokedex-page-${String(page).padStart(2, "0")}.png`);
    writeFileSync(outPath, png);
    process.stdout.write(`\r  ${page}/${totalPages} 완료`);
  }

  console.log(`\n✅ output/ 폴더에 ${totalPages}개 PNG 파일이 생성되었습니다.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
