# CSR → SSR 전환 (포켓몬 목록/검색)

날짜: 2026-04-07

## 기능 추가 / 리팩토링

- **page.tsx를 Server Component로 전환**
  - 증상/배경: 목록과 검색이 CSR + TanStack Query로 동작해 초기 로딩 시 빈 화면 노출
  - 수정/개선 내용:
    - `page.tsx`에서 `"use client"` 제거, `searchParams` prop으로 Supabase 직접 쿼리
    - 검색도 URL params 변경 → Server Component 재렌더로 SSR 처리 (별도 search API 불필요)
    - 무한 스크롤 후속 페이지만 `PokemonGrid` Client Component에서 처리
    - 필터 변경 시 `key` prop으로 PokemonGrid 상태 자동 초기화
    - TanStack Query 및 `QueryProvider` 제거
