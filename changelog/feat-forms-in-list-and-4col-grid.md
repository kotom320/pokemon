# 폼 포켓몬 목록 표시 + 모바일 4열 그리드

날짜: 2026-05-06

## 기능 추가

- **폼 포켓몬 목록 표시 (메가진화, 거다이맥스, 지역 폼 등)**
  - 배경: 조카 요청으로 폼 포켓몬이 상세 페이지에서만 보였던 것을 목록에도 표시
  - 변경 내용:
    - `supabase/schema.sql`: `base_id`(폼의 기본 포켓몬 id), `sort_id`(정렬 키) 컬럼 추가
    - `scripts/seed-supabase.mjs`: `seedForms()` 함수 추가 — 메가/거다이맥스/지역폼 등 자동 시딩
    - `src/app/api/pokemon/route.ts`: 정렬을 `sort_id, id` 기준으로 변경, 세대 필터도 `sort_id` 기준
    - `src/lib/types.ts`: `PokemonListItem`에 `displayId` 필드 추가
    - `src/components/PokemonCard.tsx`: 번호 뱃지에 `displayId` 사용 (폼은 기본 포켓몬 번호 표시)
  - 시딩 방법: `supabase/schema.sql`의 migration SQL 실행 후 `node scripts/seed-supabase.mjs` 재실행

## 성능 개선 / UX 개선

- **모바일 4열 그리드**
  - 증상: 좁은 화면에서 2열로 표시되어 한 번에 보이는 포켓몬이 적었음
  - 수정: `grid-cols-2` → `grid-cols-4` (md: 5열, lg: 6열)
  - 카드 이미지/패딩도 반응형으로 조정 (모바일: 56px 이미지, sm: 80px, md: 96px)

## 코드 정리

- **`src/lib/api.ts` 데드코드 제거**
  - `getPokemonList`, `searchPokemon`, `getPokemonListItem` 제거
  - 이미 Supabase API 라우트로 대체되어 있었음
