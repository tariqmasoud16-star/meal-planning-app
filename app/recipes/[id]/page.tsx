import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/queries";
import RecipePhoto from "@/components/RecipePhoto";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = getRecipe(Number(id));
  if (!recipe) notFound();

  return (
    <div className="max-w-2xl">
      <RecipePhoto
        photoPath={recipe.photo_path}
        cuisine={recipe.cuisine}
        title={recipe.title}
        className="mb-4 h-52 w-full rounded-lg"
      />
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-bold">{recipe.title}</h1>
        <Link
          href={`/recipes/${recipe.id}/edit`}
          className="rounded bg-stone-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-stone-700"
        >
          Edit
        </Link>
      </div>
      <p className="mb-4 text-sm text-stone-500">
        {recipe.cuisine} · {recipe.protein_grams_estimate}g protein · {recipe.active_minutes} min
        active · {recipe.method} · source: {recipe.source}
      </p>

      <h2 className="mb-2 font-semibold">Ingredients</h2>
      <ul className="mb-5 list-inside list-disc rounded-lg border border-stone-200 bg-white p-4 text-sm">
        {recipe.ingredients.map((i, idx) => (
          <li key={idx}>
            {i.amount} {i.unit} {i.name}{" "}
            <span className="text-xs text-stone-400">({i.category})</span>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 font-semibold">Steps</h2>
      <ol className="list-inside list-decimal space-y-1.5 rounded-lg border border-stone-200 bg-white p-4 text-sm">
        {recipe.steps.map((s, idx) => (
          <li key={idx}>{s}</li>
        ))}
      </ol>

      <p className="mt-4">
        <Link href="/recipes" className="text-sm text-emerald-700 hover:underline">
          ← Back to library
        </Link>
      </p>
    </div>
  );
}
