"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRecipe, updateRecipePhotoFromUrl } from "@/app/actions";
import { CUISINES, METHODS, MAX_ACTIVE_MINUTES, validateIngredients } from "@/lib/constraints";
import type { VeggieProfile } from "@/lib/constraints";
import type { Ingredient, IngredientCategory, Recipe } from "@/lib/types";
import RecipePhoto from "./RecipePhoto";

const CATEGORIES: IngredientCategory[] = ["produce", "pantry", "dairy"];

const emptyIngredient = (): Ingredient => ({
  name: "",
  amount: 1,
  unit: "piece",
  category: "produce",
});

const NO_VEGGIES: VeggieProfile = { likes: [], dislikes: [] };

export default function RecipeForm({
  recipe,
  veggies = NO_VEGGIES,
}: {
  recipe?: Recipe;
  veggies?: VeggieProfile;
}) {
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [cuisine, setCuisine] = useState<string>(recipe?.cuisine ?? "Middle Eastern");
  const [protein, setProtein] = useState(recipe?.protein_grams_estimate ?? 20);
  const [minutes, setMinutes] = useState(recipe?.active_minutes ?? 20);
  const [method, setMethod] = useState(recipe?.method ?? "stovetop");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients?.length ? recipe.ingredients : [emptyIngredient()]
  );
  const [stepsText, setStepsText] = useState(recipe?.steps.join("\n") ?? "");
  const [pending, startTransition] = useTransition();

  const warnings = useMemo(
    () =>
      validateIngredients(
        ingredients.map((i) => i.name).filter(Boolean),
        `${title} ${stepsText}`,
        veggies
      ),
    [ingredients, title, stepsText, veggies]
  );

  // Liked veggies that appear in the ingredient list — shown as encouragement.
  const likedPresent = useMemo(() => {
    const names = ingredients.map((i) => i.name.toLowerCase());
    return veggies.likes.filter((v) =>
      names.some((n) => n.includes(v.toLowerCase().trim()) && v.trim())
    );
  }, [ingredients, veggies]);

  const setIng = (idx: number, patch: Partial<Ingredient>) =>
    setIngredients((prev) => prev.map((i, j) => (j === idx ? { ...i, ...patch } : i)));

  const submit = () => {
    const cleaned = ingredients.filter((i) => i.name.trim());
    startTransition(() =>
      saveRecipe(
        {
          title: title.trim(),
          cuisine,
          protein_grams_estimate: protein,
          active_minutes: minutes,
          method,
          ingredients: cleaned,
          steps: stepsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        },
        recipe?.id
      )
    );
  };

  const levelStyle: Record<string, string> = {
    never: "bg-red-50 border-red-300 text-red-800",
    avoid: "bg-amber-50 border-amber-300 text-amber-800",
    note: "bg-sky-50 border-sky-300 text-sky-800",
  };

  return (
    <div className="max-w-2xl">
      {warnings.length > 0 && (
        <div className="mb-4 space-y-1.5" data-testid="constraint-warnings">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`rounded border px-3 py-1.5 text-sm ${levelStyle[w.level]}`}
            >
              ⚠️ <strong>{w.label}</strong> found in “{w.found_in}” — {w.reason}
            </div>
          ))}
        </div>
      )}

      {likedPresent.length > 0 && (
        <div className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">
          💚 Uses veggies you like: {likedPresent.join(", ")}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-sm">
          <span className="mb-1 block font-medium">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-stone-300 bg-white px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Cuisine</span>
          <select
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="w-full rounded border border-stone-300 bg-white px-2 py-1.5"
          >
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Method</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as Recipe["method"])}
            className="w-full rounded border border-stone-300 bg-white px-2 py-1.5"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Protein estimate (g)</span>
          <input
            type="number"
            value={protein}
            onChange={(e) => setProtein(Number(e.target.value))}
            className="w-full rounded border border-stone-300 bg-white px-2 py-1.5"
            min={0}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">
            Active minutes{" "}
            {minutes > MAX_ACTIVE_MINUTES && (
              <span className="text-amber-600">(target ≤ {MAX_ACTIVE_MINUTES})</span>
            )}
          </span>
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full rounded border border-stone-300 bg-white px-2 py-1.5"
            min={0}
          />
        </label>
      </div>

      <h2 className="mb-1 mt-5 text-sm font-semibold">Ingredients</h2>
      <div className="space-y-1.5">
        {ingredients.map((ingredient, idx) => (
          <div key={idx} className="flex gap-1.5">
            <input
              placeholder="Ingredient"
              value={ingredient.name}
              onChange={(e) => setIng(idx, { name: e.target.value })}
              className="flex-1 rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            />
            <input
              type="number"
              value={ingredient.amount}
              onChange={(e) => setIng(idx, { amount: Number(e.target.value) })}
              className="w-20 rounded border border-stone-300 bg-white px-2 py-1 text-sm"
              min={0}
              step="any"
            />
            <input
              placeholder="unit"
              value={ingredient.unit}
              onChange={(e) => setIng(idx, { unit: e.target.value })}
              className="w-20 rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            />
            <select
              value={ingredient.category}
              onChange={(e) =>
                setIng(idx, { category: e.target.value as IngredientCategory })
              }
              className="w-28 rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIngredients((prev) => prev.filter((_, j) => j !== idx))}
              className="px-1 text-stone-400 hover:text-red-600"
              title="Remove ingredient"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => setIngredients((prev) => [...prev, emptyIngredient()])}
        className="mt-2 rounded bg-stone-100 px-2 py-1 text-sm text-stone-600 hover:bg-stone-200"
      >
        + Ingredient
      </button>

      {recipe && <PhotoSection recipe={recipe} />}

      <h2 className="mb-1 mt-5 text-sm font-semibold">Steps (one per line)</h2>
      <textarea
        value={stepsText}
        onChange={(e) => setStepsText(e.target.value)}
        rows={6}
        className="w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
      />

      <div className="mt-4">
        <button
          onClick={submit}
          disabled={pending || !title.trim()}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : recipe ? "Save changes" : "Add recipe"}
        </button>
      </div>
    </div>
  );
}

function PhotoSection({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const replace = () =>
    startTransition(async () => {
      setStatus(null);
      const result = await updateRecipePhotoFromUrl(recipe.id, url.trim());
      if (result.ok) {
        setStatus("✓ Photo replaced.");
        setUrl("");
        router.refresh();
      } else {
        setStatus(`✗ ${result.error}`);
      }
    });

  return (
    <div className="mt-5" data-testid="photo-section">
      <h2 className="mb-1 text-sm font-semibold">Photo</h2>
      <div className="flex items-start gap-3">
        <RecipePhoto
          photoPath={recipe.photo_path}
          cuisine={recipe.cuisine}
          title={recipe.title}
          className="h-24 w-36 shrink-0 rounded"
        />
        <div className="flex-1">
          <p className="mb-1 text-xs text-stone-500">
            Wrong stock photo? Paste an image URL — it's downloaded once and stored locally.
          </p>
          <div className="flex gap-1.5">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…/photo.jpg"
              className="flex-1 rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            />
            <button
              onClick={replace}
              disabled={busy || !url.trim()}
              className="rounded bg-stone-800 px-3 py-1 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {busy ? "Fetching…" : "Replace"}
            </button>
          </div>
          {status && <p className="mt-1 text-xs text-stone-600">{status}</p>}
        </div>
      </div>
    </div>
  );
}
