# Zustand 기반 목록 상태 및 스크롤 복원

날짜: 2026-04-07

## 기능 개선

- **sessionStorage 기반 스크롤 복원을 Zustand 메모리 스토어로 교체**
  - 증상/배경: sessionStorage 방식에서 직렬화/역직렬화 타이밍, hydration mismatch, scroll 이벤트 throttle 등 복합적인 버그 반복 발생
  - 원인: sessionStorage는 비동기 특성과 SSR hydration 타이밍이 맞지 않아 스크롤 복원이 간헐적으로 실패
  - 수정/개선 내용:
    - `src/lib/listStore.ts`: Zustand 스토어 생성 (key, extra, done, scrollY 보관)
    - 카드 클릭 시 `save()` 로 현재 상태를 메모리에 즉시 저장
    - 마운트 시 `snapshot.key === gridKey` 로 캐시 여부 확인
    - 캐시 있으면 스켈레톤 표시 → rAF 한 번으로 스크롤 복원 → 실제 콘텐츠 표시
    - 캐시 없으면 즉시 콘텐츠 표시 (스켈레톤 없음)

## 주의사항

- Zustand 스토어는 메모리 기반이므로 페이지 새로고침 시 초기화됨
- 뒤로가기 시나리오(SPA 내 네비게이션)에서만 복원 동작
