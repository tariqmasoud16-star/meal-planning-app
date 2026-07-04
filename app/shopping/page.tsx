import { getRecipe, getWeekPlan } from "@/lib/queries";
import { currentWeekDates } from "@/lib/week";
import type { Ingredient, IngredientCategory } from "@/lib/types";
import ShoppingChecklist, { type ShoppingItem } from "@/components/ShoppingChecklist";

export const dynamic = "force-dynamic";

function mergeIngredients(all: Ingredient[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const i of all) {
    const key = `${i.name.trim().toLowerCase()}|${i.unit.trim().toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount += i.amount;
    } else {
      map.set(key, {
        name: i.name.trim(),
        unit: i.unit,
        amount: i.amount,
        category: i.category,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function ShoppingPage() {
  const dates = currentWeekDates();
  const plan = getWeekPlan(dates);
  const cookEntries = plan.filter((e) => e.entry_type === "cook" && e.recipe_id);

  const recipeTitles: string[] = [];
  const allIngredients: Ingredient[] = [];
  for (const entry of cookEntries) {
    const recipe = getRecipe(entry.recipe_id!);
    if (!recipe) continue;
    recipeTitles.push(recipe.title);
    allIngredients.push(...recipe.ingredients);
  }

  const items = mergeIngredients(allIngredients);
  const groups: Record<IngredientCategory, ShoppingItem[]> = {
    produce: items.filter((i) => i.category === "produce"),
    dairy: items.filter((i) => i.category === "dairy"),
    pantry: items.filter((i) => i.category === "pantry"),
  };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">Shopping list</h1>
      <p className="mb-4 text-sm text-stone-500">
        {cookEntries.length === 0
          ? "No cook entries planned this week — assign recipes on the week view first."
          : `From ${cookEntries.length} planned meal${cookEntries.length > 1 ? "s" : ""}: ${recipeTitles.join(", ")}`}
      </p>
      {items.length > 0 && <ShoppingChecklist groups={groups} />}
    </div>
  );
}
