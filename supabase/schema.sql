-- 포켓몬 목록 테이블
create table if not exists pokemon (
  id          integer primary key,
  name        text not null,
  korean_name text not null,
  image_url   text not null,
  types       text[] not null default '{}',
  generation  integer not null
);

-- 이름 검색 인덱스
create index if not exists idx_pokemon_korean_name on pokemon using gin (korean_name gin_trgm_ops);

-- trigram 확장 활성화 (ILIKE 검색 최적화)
create extension if not exists pg_trgm;

-- RLS 비활성화 (읽기 전용 공개 데이터)
alter table pokemon disable row level security;
