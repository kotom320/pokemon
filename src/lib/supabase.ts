import { createClient } from "@supabase/supabase-js";

// 빌드 타임에는 환경변수가 없을 수 있으므로 빈 문자열 fallback
// 실제 API 호출은 런타임에만 발생하므로 문제 없음
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "",
);

export interface PokemonRow {
  id: number;
  name: string;
  korean_name: string;
  image_url: string;
  types: string[];
  generation: number;
}
