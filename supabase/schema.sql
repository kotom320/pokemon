-- 포켓몬 목록 테이블
create table if not exists pokemon (
  id          integer primary key,
  name        text not null,
  korean_name text not null,
  image_url   text not null,
  types       text[] not null default '{}',
  generation  integer not null,
  base_id     integer,          -- 폼의 경우 기본 포켓몬 id, 기본 포켓몬은 null
  sort_id     integer not null default 0  -- 정렬 기준 (기본 포켓몬 id; 폼도 base_id 값)
);

-- 기존 테이블에 컬럼 추가 (migration)
alter table pokemon add column if not exists base_id  integer;
alter table pokemon add column if not exists sort_id  integer not null default 0;
update pokemon set sort_id = id where sort_id = 0;

-- 이름 검색 인덱스
create index if not exists idx_pokemon_korean_name on pokemon using gin (korean_name gin_trgm_ops);
-- 정렬 인덱스
create index if not exists idx_pokemon_sort on pokemon(sort_id, id);

-- trigram 확장 활성화 (ILIKE 검색 최적화)
create extension if not exists pg_trgm;

-- RLS 활성화 + 공개 읽기 허용
alter table pokemon enable row level security;

create policy "Allow public read"
  on pokemon
  for select
  using (true);
