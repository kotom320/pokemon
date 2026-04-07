/**
 * 포켓몬 도감 이미지 생성 스크립트
 * 실행: node scripts/generate-pokedex-list.mjs
 * 출력: output/pokedex-page-01.png, 02.png, ...
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
const MARGIN = 48;
const COLS = 6;
const ROWS = 8;
const PER_PAGE = COLS * ROWS;
const CELL_W = Math.floor((PAGE_W - MARGIN * 2) / COLS);
const CELL_H = Math.floor((PAGE_H - MARGIN * 2 - 60) / ROWS); // 60 = 헤더
const IMG_SIZE = Math.floor(CELL_H * 0.68);

function loadFont() {
  const candidates = [
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
  ];
  for (const p of candidates) {
    try { return readFileSync(p); } catch {}
  }
  throw new Error("한국어 폰트를 찾을 수 없습니다.\n" + candidates.join("\n"));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return "data:image/png;base64," + Buffer.from(buf).toString("base64");
  } catch {
    return null;
  }
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
  console.log("📡 전체 포켓몬 정보 가져오는 중...");
  const list = await fetchJson(`${BASE_URL}/pokemon-species?limit=1025&offset=0`);

  const entries = [];
  const BATCH = 30;

  for (let i = 0; i < list.results.length; i += BATCH) {
    const batch = list.results.slice(i, i + BATCH);
    const speciesList = await Promise.all(batch.map((s) => fetchJson(s.url)));

    for (const species of speciesList) {
      const koreanName = species.names.find((n) => n.language.name === "ko")?.name;
      if (!koreanName) continue;

      entries.push({
        displayId: species.id,
        imageId: species.id,
        koreanName,
        isForm: false,
      });

      // 폼: 실제 pokemon ID를 가져와야 이미지 URL을 알 수 있음
      const forms = species.varieties.filter(
        (v) => !v.is_default && isRelevantForm(v.pokemon.name)
      );
      for (const form of forms) {
        entries.push({
          displayId: species.id,
          imageId: null, // 아래에서 별도 조회
          koreanName: getKoreanFormName(form.pokemon.name, koreanName),
          isForm: true,
          slug: form.pokemon.name,
        });
      }
    }

    const pct = Math.min(100, Math.round(((i + BATCH) / list.results.length) * 100));
    process.stdout.write(`\r  진행: ${pct}% (${Math.min(i + BATCH, list.results.length)}/${list.results.length})`);
  }

  // 폼의 실제 imageId 조회
  const formsWithoutId = entries.filter((e) => e.isForm && e.imageId === null);
  if (formsWithoutId.length > 0) {
    console.log(`\n  폼 이미지 ID 조회 중 (${formsWithoutId.length}개)...`);
    const FBATCH = 20;
    for (let i = 0; i < formsWithoutId.length; i += FBATCH) {
      const batch = formsWithoutId.slice(i, i + FBATCH);
      await Promise.all(
        batch.map(async (entry) => {
          try {
            const p = await fetchJson(`${BASE_URL}/pokemon/${entry.slug}`);
            entry.imageId = p.id;
          } catch {
            entry.imageId = entry.displayId; // fallback
          }
        })
      );
    }
  }

  console.log(`\n✅ 총 ${entries.length}개 항목 준비 완료`);
  return entries.sort((a, b) => a.displayId - b.displayId || (a.isForm ? 1 : -1));
}

async function buildPage(pageEntries, pageNum, totalPages, font) {
  // 이미지 병렬 다운로드 — null이면 해당 항목 제외
  process.stdout.write(`\r  ${pageNum}/${totalPages} 이미지 다운로드 중...`);
  const rawImages = await Promise.all(
    pageEntries.map((e) =>
      fetchImageAsBase64(
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${e.imageId}.png`
      )
    )
  );

  // 이미지 없는 항목 제거
  const validPairs = pageEntries
    .map((entry, i) => ({ entry, img: rawImages[i] }))
    .filter((p) => p.img !== null);

  const filteredEntries = validPairs.map((p) => p.entry);
  const images = validPairs.map((p) => p.img);

  // 빈 셀로 채우기 (마지막 페이지 또는 제외된 항목만큼)
  while (filteredEntries.length < PER_PAGE) {
    filteredEntries.push(null);
    images.push(null);
  }
  const finalEntries = filteredEntries;

  const cells = finalEntries.map((entry, i) => {
    if (!entry) {
      return {
        type: "div",
        props: { style: { width: CELL_W, height: CELL_H, display: "flex" }, children: " " },
      };
    }
    return {
      type: "div",
      props: {
        style: {
          width: CELL_W,
          height: CELL_H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          padding: "4px 2px",
        },
        children: [
          images[i]
            ? {
                type: "img",
                props: {
                  src: images[i],
                  width: IMG_SIZE,
                  height: IMG_SIZE,
                  style: { objectFit: "contain" },
                },
              }
            : {
                type: "div",
                props: {
                  style: { width: IMG_SIZE, height: IMG_SIZE, display: "flex", background: "#f3f4f6", borderRadius: 8 },
                  children: " ",
                },
              },
          {
            type: "span",
            props: {
              style: {
                fontSize: 11,
                color: "#9ca3af",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              },
              children: String(entry.displayId).padStart(3, "0"),
            },
          },
          {
            type: "span",
            props: {
              style: {
                fontSize: entry.isForm ? 11 : 13,
                fontWeight: entry.isForm ? "normal" : "bold",
                color: entry.isForm ? "#6b7280" : "#111827",
                textAlign: "center",
                lineHeight: 1.2,
                maxWidth: CELL_W - 8,
              },
              children: entry.koreanName,
            },
          },
        ],
      },
    };
  });

  const rows = Array.from({ length: ROWS }, (_, r) => ({
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "row" },
      children: cells.slice(r * COLS, (r + 1) * COLS),
    },
  }));

  const jsx = {
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
        gap: 0,
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderBottom: "2px solid #e5e7eb",
              paddingBottom: 10,
              marginBottom: 10,
              height: 50,
            },
            children: [
              {
                type: "span",
                props: {
                  style: { fontSize: 24, fontWeight: "bold", color: "#111827" },
                  children: "포켓몬 도감",
                },
              },
              {
                type: "span",
                props: {
                  style: { fontSize: 13, color: "#6b7280" },
                  children: `${pageNum} / ${totalPages}`,
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", flex: 1 },
            children: rows,
          },
        },
      ],
    },
  };

  const svg = await satori(jsx, {
    width: PAGE_W,
    height: PAGE_H,
    fonts: [{ name: "Korean", data: font, weight: 400, style: "normal" }],
  });

  return new Resvg(svg, { fitTo: { mode: "width", value: PAGE_W } }).render().asPng();
}

async function main() {
  const font = loadFont();
  const entries = await fetchAllEntries();
  const totalPages = Math.ceil(entries.length / PER_PAGE);

  const outDir = join(__dirname, "../output");
  mkdirSync(outDir, { recursive: true });

  console.log(`\n🖼  총 ${totalPages}장 생성 중 (페이지당 ${PER_PAGE}마리)...\n`);

  for (let page = 1; page <= totalPages; page++) {
    const pageEntries = entries.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const png = await buildPage([...pageEntries], page, totalPages, font);
    const outPath = join(outDir, `pokedex-page-${String(page).padStart(2, "0")}.png`);
    writeFileSync(outPath, png);
    process.stdout.write(`\r  ${page}/${totalPages} 저장 완료: ${outPath.split("/").pop()}`);
    console.log();
  }

  console.log(`\n✅ output/ 폴더에 ${totalPages}개 PNG 파일이 생성되었습니다.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
