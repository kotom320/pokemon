import { getPokemonDetail } from "@/lib/api";
import { notFound } from "next/navigation";
import PokemonNavigation from "@/components/PokemonNavigation";
import PokemonDetailView from "@/components/PokemonDetailView";

export default async function PokemonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId) || numId < 1) notFound();

  const pokemon = await getPokemonDetail(numId).catch(() => null);
  if (!pokemon) notFound();

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <PokemonNavigation displayId={pokemon.displayId} />
      <PokemonDetailView initialData={pokemon} />
    </main>
  );
}
