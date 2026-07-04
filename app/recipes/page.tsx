import Link from "next/link";
import { getRecipes } from "@/lib/queries";
import { CUISINES } from "@/lib/constraints";
import RecipePhoto from "@/components/RecipePhoto";

export const dynamic = "force-dynamic";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ cuisine?: string; maxMinutes?: string; minProtein?: string }>;
}) {
  const params = await searchParams;
  const cuisine = params.cuisine || undefined;
  const maxMinutes = params.maxMinutes ? Number(params.maxMinutes) : undefined;
  const minProtein = params.minProtein ? Number(params.minProtein) : undefined;
  const recipes = getRecipes({ cuisine, maxMinutes, minProtein });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Recipe library</h1>
        <Link
          href="/recipes/new"
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + Add recipe
        </Link>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-stone-500">Cuisine</span>
          <select
            name="cuisine"
            defaultValue={cuisine ?? ""}
            className="rounded border border-stone-300 bg-white px-2 py-1"
          >
            <option value="">All</option>
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-stone-500">Max active minutes</span>
          <input
            type="number"
            name="maxMinutes"
            defaultValue={params.maxMinutes ?? ""}
            className="w-24 rounded border border-stone-300 bg-white px-2 py-1"
            min={0}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-stone-500">Min protein (g)</span>
          <input
            type="number"
            name="minProtein"
            defaultValue={params.minProtein ?? ""}
            className="w-24 rounded border border-stone-300 bg-white px-2 py-1"
            min={0}
          />
        </label>
        <button
          type="submit"
          className="rounded bg-stone-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-stone-700"
        >
          Filter
        </button>
        <Link href="/recipes" className="text-sm text-stone-500 hover:text-stone-800">
          Reset
        </Link>
      </form>

      <p className="mb-2 text-sm text-stone-500">{recipes.length} recipes</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((r) => (
          <Link
            key={r.id}
            href={`/recipes/${r.id}`}
            className="overflow-hidden rounded-lg border border-stone-200 bg-white transition-shadow hover:shadow-md"
          >
            <RecipePhoto
              photoPath={r.photo_path}
              cuisine={r.cuisine}
              title={r.title}
              className="h-36 w-full"
            />
            <div className="px-3 py-2.5">
              <div className="font-medium leading-snug">{r.title}</div>
              <div className="mt-0.5 text-sm text-stone-500">
                {r.cuisine} · {r.protein_grams_estimate}g protein · {r.active_minutes} min ·{" "}
                {r.method}
                {r.source === "manual" && (
                  <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700">
                    manual
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
        {recipes.length === 0 && (
          <p className="text-sm text-stone-500">No recipes match these filters.</p>
        )}
      </div>
    </div>
  );
}
