import { getRecipe, getWeekPlan } from "@/lib/queries";
import { currentWeekDates } from "@/lib/week";
import type { Ingredient, IngredientCategory } from "@/lib/types";
import ShoppingChecklist, { type ShoppingItem } from "@/components/ShoppingChecklist";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// DD.MM.YYYY from an ISO YYYY-MM-DD, without timezone surprises.
function deDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

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

  const weekRange = `${deDate(dates[0])} – ${deDate(dates[6])}`;

  return (
    <div className="print-shopping max-w-2xl">
      {/* Screen-only heading + controls */}
      <div className="no-print mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-xl font-bold">Shopping list</h1>
          <p className="text-sm text-stone-500">
            {cookEntries.length === 0
              ? "No cook entries planned this week — assign recipes on the week view first."
              : `From ${cookEntries.length} planned meal${cookEntries.length > 1 ? "s" : ""}: ${recipeTitles.join(", ")}`}
          </p>
        </div>
        {items.length > 0 && <PrintButton />}
      </div>

      {/* Print-only header block: self-explaining at the supermarket */}
      <div className="print-only print-header">
        <h1>Einkaufsliste</h1>
        <p className="print-range">{weekRange}</p>
        {recipeTitles.length > 0 && (
          <ul className="print-recipes">
            {recipeTitles.map((title, i) => (
              <li key={i}>{title}</li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && <ShoppingChecklist groups={groups} />}
    </div>
  );
}
