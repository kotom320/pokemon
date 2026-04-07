# Hydration mismatch 및 중복 key 버그 수정

날짜: 2026-04-07

## 버그 수정

- **Hydration failed: server/client HTML mismatch**
  - 증상: `if (typeof window !== 'undefined')` 분기로 `useState` 초기값을 sessionStorage에서 읽어 서버와 클라이언트 초기 렌더가 달라짐
  - 원인: Server Component가 렌더한 HTML과 클라이언트 초기 상태가 불일치
  - 수정: `useState` 초기값은 항상 서버와 동일한 기본값으로 설정, sessionStorage 복원은 `useEffect`(마운트 후)에서만 수행

- **Encountered two children with the same key (중복 포켓몬 렌더)**
  - 증상: 필터 적용 후 목록 스크롤 시 동일 포켓몬 카드가 두 번 렌더됨
  - 원인: 복원 `useEffect`와 IntersectionObserver가 동시에 실행되어 같은 offset으로 중복 fetch 발생. 또한 `offset` 상태가 실제 로드된 아이템 수와 불일치 가능
  - 수정:
    - `offset` 상태 제거 → `initialItems.length + extraRef.current.length`로 실시간 계산
    - `extraRef`로 `loadMore` 클로저의 stale capture 방지
    - `restored` 상태 추가 → sessionStorage 복원 완료 전에는 IntersectionObserver 시작하지 않음

- **스크롤 복원이 동작하지 않는 문제**
  - 증상: 상세 → 뒤로가기 시 extra 아이템은 복원되나 스크롤 위치가 복원되지 않음
  - 원인: `requestAnimationFrame`이 React의 DOM 커밋 전에 실행되어 페이지 높이가 부족한 상태에서 scrollTo 호출
  - 수정: 스크롤 값을 `pendingScrollRef`에 보관 후, `extra.length`가 변경된 useEffect(DOM 반영 후)에서 실행

- **뒤로가기 시 화면이 덜컥거리는 문제 (스켈레톤 적용)**
  - 증상: 복원 중 SSR의 20개 아이템이 잠깐 보이다가 스크롤 위치로 이동하는 시각적 점프 발생
  - 원인: `visible=false`(invisible) 상태에서도 hydration 이후 일시적으로 콘텐츠가 노출됨
  - 수정: `visible=false`일 때 `SkeletonCard` 20개를 렌더. 복원 + 스크롤 완료 후 실제 콘텐츠로 교체. 스켈레톤은 "로딩 중" 피드백을 제공하며 덜컥임 없이 올바른 위치에서 표시

- **스크롤 위치가 간헐적으로 저장되지 않는 문제**
  - 증상: scroll 이벤트로 저장 시 빠르게 클릭하면 마지막 위치가 저장되기 전에 페이지를 떠남
  - 원인: 브라우저가 scroll 이벤트를 throttle하므로 이탈 시점의 정확한 위치 보장 불가
  - 수정: scroll 이벤트 리스너 제거 → 카드 클릭(`handleNavigate`) 시점에 `window.scrollY`를 즉시 저장. 클릭은 네비게이션 직전에 반드시 실행되므로 항상 정확한 값 보장
