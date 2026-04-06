# 진화 체인 표시 기능 추가

날짜: 2026-04-07

## 기능 추가

- **상세 페이지에 진화 체인 표시**
  - PokeAPI `/evolution-chain` 엔드포인트로 진화 관계 fetch
  - 분기 진화 지원 (예: 수륙챙이 → 강챙이 or 왕구리)
  - 현재 보고 있는 포켓몬은 빨간 테두리로 강조 표시
  - 진화 단계 클릭 시 해당 포켓몬 상세 페이지로 이동
  - 진화가 없는 포켓몬(전설 등)은 섹션 미표시

- **구현 세부사항**
  - `EvolutionNode` 트리 타입 추가 (기존 flat array `EvolutionStage[]` 대체)
  - `buildEvolutionNode` 재귀 함수로 트리 구성, 각 단계 한국어 이름 포함
  - `getAlternateForms`와 `getEvolutionChain`을 `Promise.all`로 병렬 fetch
  - `EvolutionChain` 컴포넌트: 분기 시 세로 나열, 가로 스크롤 지원
