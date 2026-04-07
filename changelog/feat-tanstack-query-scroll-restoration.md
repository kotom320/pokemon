# TanStack Query 기반 목록 캐시 및 스크롤 복원

날짜: 2026-04-07

## 기능 개선

- **스크롤 복원을 TanStack Query 캐시 방식으로 전환**
  - 증상/배경: sessionStorage, Zustand 등 다양한 방법으로 스크롤 복원을 시도했으나 hydration 타이밍, 직렬화 오류 등 복합적인 버그 반복 발생
  - 원인: SSR 후 클라이언트 상태 동기화 타이밍이 맞지 않아 스크롤 복원이 불안정함. 이전에 PokeAPI + TanStack Query 조합에서는 정상 동작했음을 근거로 캐시 방식으로 복귀
  - 수정/개선 내용:
    - `page.tsx`: SSR로 첫 페이지 fetch 후 `initialData`로 TanStack Query에 전달
    - `PokemonGrid`: `useInfiniteQuery` + `gcTime: Infinity` 로 언마운트 후에도 캐시 유지
    - 뒤로가기 시 캐시에서 즉시 렌더 → 데이터가 이미 있으므로 `scrollTo` 즉시 적용 가능
    - 스크롤 위치는 모듈 레벨 `scrollMap`에 클릭 시 저장 (직렬화 불필요)
    - 검색은 SSR 전용으로 분리 (결과 고정, 캐시 불필요)
    - Zustand 스토어, skeleton 제거
    - QueryProvider layout.tsx에 재추가
