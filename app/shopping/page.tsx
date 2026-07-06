import Link from "next/link";
import { getRecipe, getWeekPlan } from "@/lib/queries";
import { currentWeekDates, nextWeekDates } from "@/lib/week";
import type { Ingredient, IngredientCategory, PlanEntry } from "@/lib/types";
import ShoppingChecklist, { type ShoppingItem } from "@/components/ShoppingChecklist";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

type WeekKey = "current" | "next";

const hasCook = (plan: PlanEntry[]) =>
  plan.some((e) => e.entry_type === "cook" && e.recipe_id);

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

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const currentDates = currentWeekDates();
  const nextDates = nextWeekDates();
  const nextPlan = getWeekPlan(nextDates);

  // Default to next week when it has any planned cooking (shop-ahead case),
  // otherwise the current week. An explicit ?week= override always wins.
  const requested = (await searchParams).week;
  const selected: WeekKey =
    requested === "current" || requested === "next"
      ? requested
      : hasCook(nextPlan)
        ? "next"
        : "current";

  const dates = selected === "next" ? nextDates : currentDates;
  const plan = selected === "next" ? nextPlan : getWeekPlan(currentDates);
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
      {/* Screen-only week selector */}
      <div className="no-print mb-4 flex gap-2">
        {(["current", "next"] as WeekKey[]).map((w) => (
          <Link
            key={w}
            href={`/shopping?week=${w}`}
            className={`rounded px-3 py-1.5 text-sm font-semibold ${
              selected === w
                ? "bg-emerald-600 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {w === "current" ? "This week" : "Next week"}
          </Link>
        ))}
      </div>

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
