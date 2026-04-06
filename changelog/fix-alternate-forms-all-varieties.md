# 모든 폼 표시 및 한국어 폼 이름 개선

날짜: 2026-04-07

## 버그 수정

- **로토무, 캐스퐁 등 고유 폼이 alternate forms에 표시되지 않던 문제 수정**
  - 증상: 메가진화/거대이맥스/지역 폼 외의 폼(로토무 열, 캐스퐁 맑은 날씨 폼 등)이 상세 페이지에 표시되지 않음
  - 원인: `getAlternateForms`에서 `isRelevantForm` 필터가 특정 suffix 패턴만 통과시켜 고유 폼 제외
  - 수정: `isRelevantForm` 필터 제거 → species의 모든 variety를 표시

## 기능 개선

- **폼 한국어 이름을 PokeAPI에서 직접 조회**
  - 기존: slug 패턴 매칭으로 하드코딩된 한국어 이름 반환 (알 수 없는 폼은 영문 slug 그대로 표시)
  - 개선: `/pokemon-form/{slug}` 엔드포인트의 `form_names` 필드에서 `ko` 언어 이름 조회
    - `/pokemon` 데이터와 병렬로 fetch하여 지연 없음
    - PokeAPI에 한국어 폼 이름이 없을 경우 기존 패턴 매칭으로 폴백
