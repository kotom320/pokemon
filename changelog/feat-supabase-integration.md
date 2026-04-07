# Supabase 데이터베이스 연동

날짜: 2026-04-07

## 기능 추가

- **포켓몬 목록/검색 데이터를 Supabase PostgreSQL로 이전**
  - 증상/배경: PokeAPI rate limit과 cold-start 시 서버 메모리 캐시 초기화로 검색이 느리거나 실패하는 문제
  - 원인: 목록 조회 시 PokeAPI를 매번 호출하고, 검색 캐시는 서버 재시작 시 소멸
  - 수정/개선 내용:
    - `src/lib/supabase.ts`: Supabase 클라이언트 싱글턴 + `PokemonRow` 타입 정의
    - `supabase/schema.sql`: `pokemon` 테이블 스키마 (id, name, korean_name, image_url, types[], generation) + pg_trgm 인덱스
    - `scripts/seed-supabase.mjs`: PokeAPI에서 1025마리 데이터를 Supabase에 일괄 저장하는 시드 스크립트
    - `/api/pokemon` 라우트: Supabase 쿼리로 교체 — 세대(id range) + 타입(array contains) 필터 모두 지원
    - `/api/pokemon/search` 라우트: Supabase `ILIKE` 검색으로 교체 — 이름 부분 검색 및 번호 정확 검색 지원
