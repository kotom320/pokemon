# 뒤로가기 시 페이지 깜박임 수정

날짜: 2026-04-07

## 버그 수정

- **상세 → 목록 뒤로가기 시 전체 화면 깜박임**
  - 증상: 상세 페이지에서 뒤로가기 시 목록이 잠깐 빈 화면으로 보였다가 나타남
  - 원인: Next.js App Router가 dynamic 페이지(searchParams 사용)의 RSC 캐시를 기본 0초로 설정 → 뒤로가기 시 매번 Supabase 재쿼리 발생
  - 수정:
    - `next.config.ts`에 `experimental.staleTimes.dynamic: 30` 추가 → 클라이언트 라우터 캐시에 30초간 RSC 페이로드 유지
    - `src/app/loading.tsx` 추가 → 30초 초과 후 재fetch 시 스켈레톤 표시 (빈 화면 방지)
