# 포켓몬 도감 (Pokemon Pokédex)

조카를 위한 한국어 포켓몬 도감 웹사이트. 번호순 정렬과 공식 한국어 이름 표기를 목표로 한다.

## 프로젝트 개요

- **목적**: 포켓몬을 번호순으로 나열하고 한국어로 정보를 제공하는 도감 사이트
- **대상**: 포켓몬을 좋아하는 어린이 (조카)
- **언어**: 한국어 (UI 전체, 포켓몬 이름 포함)
- **배포**: Vercel (GitHub 레포 연결, main 브랜치 자동 배포)
- **레포**: https://github.com/kotom320/pokemon

## 기술 스택

- **프레임워크**: Next.js (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **데이터**: [PokeAPI](https://pokeapi.co/) — 무료, 공개 API, 인증 불필요

## PokeAPI 활용 가이드

### 한국어 이름 가져오기

PokeAPI는 공식 한국어(`ko`) 이름을 지원한다. 직역된 일본어 이름이 아닌 **공식 한국어 이름**을 사용할 것.

```ts
// 포켓몬 종 정보에서 한국어 이름 추출
const species = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`).then(r => r.json());
const koreanName = species.names.find((n: { language: { name: string }; name: string }) => n.language.name === 'ko')?.name;
```

### 주요 엔드포인트

```
GET https://pokeapi.co/api/v2/pokemon?limit=151&offset=0   // 목록 (페이지네이션)
GET https://pokeapi.co/api/v2/pokemon/{id}                  // 포켓몬 상세 (스탯, 타입, 이미지)
GET https://pokeapi.co/api/v2/pokemon-species/{id}          // 종 정보 (한국어 이름, 설명)
GET https://pokeapi.co/api/v2/type/{id}                     // 타입 정보 (한국어 타입명)
```

### 이미지

공식 스프라이트: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`

### 주의사항

- PokeAPI는 rate limit이 있으므로 응답을 캐싱할 것 (Next.js `fetch` 캐시 활용)
- 전체 포켓몬을 한 번에 로드하지 말고 페이지네이션 또는 무한 스크롤 적용
- 타입명도 PokeAPI의 `ko` 언어 데이터로 가져올 것

## 핵심 기능

### MVP (필수)
- [ ] 포켓몬 목록 — 번호순 정렬, 이름(한국어), 이미지, 타입
- [ ] 페이지네이션 또는 무한 스크롤
- [ ] 포켓몬 상세 페이지 — 스탯, 타입, 설명(한국어)
- [ ] 반응형 디자인 (모바일 우선)

### 추가 기능 (선택)
- [ ] 이름/번호 검색
- [ ] 타입별 필터
- [ ] 세대별 필터
- [ ] 진화 체인 표시

## 한국어 현지화 원칙

1. 모든 UI 텍스트는 한국어
2. 포켓몬 이름: PokeAPI `ko` 언어 데이터 우선 사용
3. 타입명: PokeAPI `ko` 언어 데이터 우선 사용
4. 포켓몬 설명(flavor text): `ko` 언어 데이터 우선, 없으면 숨김 처리

## 개발 규칙

- 컴포넌트는 `src/components/`, 페이지는 `src/app/`
- API 호출 로직은 `src/lib/` 에 분리
- TypeScript strict 모드 사용
- 에러 상태와 로딩 상태를 항상 처리할 것
- 이미지는 Next.js `<Image>` 컴포넌트 사용

## 변경 이력 관리

- 변경 이력은 `changelog/` 폴더에 파일로 관리한다
- 파일명 형식: `{변경-요약}.md` (영문 소문자, 단어는 `-`로 구분)
  - 예: `fix-alternate-forms-api-parallel.md`
- 각 파일의 형식:
  ```
  # {변경 요약 제목}

  날짜: YYYY-MM-DD

  ## 버그 수정 / 성능 개선 / 기능 추가 (해당 항목만 포함)

  - **변경 제목**
    - 증상/배경:
    - 원인:
    - 수정/개선 내용:
  ```

## 실행 방법

```bash
npm install
npm run dev     # 개발 서버 (http://localhost:3000)
npm run build   # 프로덕션 빌드
npm run lint    # 린트 검사
```
