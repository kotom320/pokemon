# 변경 이력 001

날짜: 2026-04-07

## 버그 수정

- **alternate form 목록에 표시되던 문제 수정**
  - 증상: 포켓몬 목록에 ID 10000번대 alternate form(메가진화, 지역 폼 등)이 일반 포켓몬처럼 출력됨
  - 원인: `/pokemon` 엔드포인트는 기본 폼 + alternate form을 모두 반환함
  - 수정: `getPokemonList`에서 `/pokemon` → `/pokemon-species` 엔드포인트로 변경
    - `/pokemon-species`는 기본 종(1~1025)만 반환하므로 alternate form이 포함되지 않음
    - 별도의 total count 요청도 제거됨 (list 응답의 `count` 필드 직접 사용)

## 성능 개선

- **API 호출 병렬화로 목록/상세 페이지 로딩 속도 개선**
  - 기존: `fetchPokemon(id)` 완료 후 → `fetchSpecies(url)` 순차 호출 (직렬)
  - 개선: `Promise.all([fetchPokemon(id), fetchSpecies(id)])` 병렬 호출
  - 적용 함수: `getPokemonListItem`, `getPokemonDetail`
  - 효과: 포켓몬 1마리당 API 대기 시간이 약 절반으로 단축 (20마리 기준 전체 로딩 시간 대폭 감소)
