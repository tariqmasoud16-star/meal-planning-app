"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCuisinePrefs, getRecipes, getWeekPlan } from "@/lib/queries";
import { CUISINES } from "@/lib/constraints";
import { currentWeekDates, nextWeekDates } from "@/lib/week";
import { proposeWeek, rerollDay, type CuisineWeights, type ProposalDay } from "@/lib/proposal";
import type { EntryType, FillMethod, Ingredient, VeggieSentiment } from "@/lib/types";

export type WeekKey = "current" | "next";

function upsertDinner(
  date: string,
  entryType: EntryType,
  recipeId: number | null,
  eatOutNote: string | null,
  fillMethod: FillMethod
) {
  db.prepare(
    `INSERT INTO week_plan (date, slot, entry_type, recipe_id, eat_out_note, fill_method)
     VALUES (?, 'dinner', ?, ?, ?, ?)
     ON CONFLICT(date, slot) DO UPDATE SET
       entry_type = excluded.entry_type,
       recipe_id = excluded.recipe_id,
       eat_out_note = excluded.eat_out_note,
       fill_method = excluded.fill_method`
  ).run(date, entryType, recipeId, eatOutNote, fillMethod);
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/shopping");
}

/** Build the week as the proposal engine sees it. Proposed cells are re-plannable;
 *  manual picks, eat-out and leftovers are locked. */
function proposalDays(dates: string[]): ProposalDay[] {
  const entries = getWeekPlan(dates);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  return dates.map((date) => {
    const e = byDate.get(date);
    return {
      date,
      locked: !!e && e.fill_method !== "proposed",
      recipeId: e?.recipe_id ?? null,
    };
  });
}

const proposalRecipes = () =>
  getRecipes().map((r) => ({ id: r.id, cuisine: r.cuisine, active_minutes: r.active_minutes }));

const cuisineWeights = (): CuisineWeights =>
  new Map(getCuisinePrefs().map((p) => [p.cuisine, p.weight]));

const datesFor = (week: WeekKey) => (week === "next" ? nextWeekDates() : currentWeekDates());
const otherWeek = (week: WeekKey): WeekKey => (week === "next" ? "current" : "next");

/** Which visible week a date belongs to, or null if it's in neither. */
function weekOfDate(date: string): WeekKey | null {
  if (currentWeekDates().includes(date)) return "current";
  if (nextWeekDates().includes(date)) return "next";
  return null;
}

/** Recipe ids already planned (cook cells) across the given dates. */
function plannedRecipeIds(dates: string[]): number[] {
  return getWeekPlan(dates)
    .filter((e) => e.entry_type === "cook" && e.recipe_id)
    .map((e) => e.recipe_id!);
}

export async function planWeek(week: WeekKey = "current") {
  const dates = datesFor(week);
  // No-repeat window spans both visible weeks: exclude the other week's recipes.
  const excluded = plannedRecipeIds(datesFor(otherWeek(week)));
  const assignments = proposeWeek(proposalDays(dates), proposalRecipes(), excluded, cuisineWeights());
  const apply = db.transaction(() => {
    for (const [date, recipeId] of assignments) {
      upsertDinner(date, "cook", recipeId, null, "proposed");
    }
  });
  apply();
  refresh();
}

export async function rerollDinner(date: string) {
  const week = weekOfDate(date);
  if (!week) return;
  const dates = datesFor(week);
  const days = proposalDays(dates);
  const target = days.find((d) => d.date === date);
  if (!target || target.locked) return; // never overwrite manual/eat-out/leftovers
  const excluded = plannedRecipeIds(datesFor(otherWeek(week)));
  const recipeId = rerollDay(days, date, proposalRecipes(), excluded, cuisineWeights());
  if (recipeId === null) return;
  upsertDinner(date, "cook", recipeId, null, "proposed");
  refresh();
}

export async function assignRecipe(date: string, recipeId: number) {
  upsertDinner(date, "cook", recipeId, null, "manual");
  refresh();
}

export async function markEatOut(date: string, cuisine: string, note: string) {
  upsertDinner(date, "eat_out", null, JSON.stringify({ cuisine, note }), "eat_out");
  refresh();
}

export async function markLeftovers(date: string) {
  upsertDinner(date, "leftovers", null, null, "leftovers");
  refresh();
}

export async function clearSlot(date: string) {
  db.prepare("DELETE FROM week_plan WHERE date = ? AND slot = 'dinner'").run(date);
  refresh();
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export interface RecipeInput {
  title: string;
  cuisine: string;
  protein_grams_estimate: number;
  active_minutes: number;
  method: string;
  ingredients: Ingredient[];
  steps: string[];
}

export async function saveRecipe(input: RecipeInput, id?: number) {
  let recipeId: number;
  if (id) {
    db.prepare(
      `UPDATE recipes SET title = ?, cuisine = ?, protein_grams_estimate = ?,
       active_minutes = ?, method = ?, ingredients = ?, steps = ? WHERE id = ?`
    ).run(
      input.title,
      input.cuisine,
      input.protein_grams_estimate,
      input.active_minutes,
      input.method,
      JSON.stringify(input.ingredients),
      JSON.stringify(input.steps),
      id
    );
    recipeId = id;
  } else {
    const result = db
      .prepare(
        `INSERT INTO recipes (title, cuisine, protein_grams_estimate, active_minutes, method, ingredients, steps, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'manual')`
      )
      .run(
        input.title,
        input.cuisine,
        input.protein_grams_estimate,
        input.active_minutes,
        input.method,
        JSON.stringify(input.ingredients),
        JSON.stringify(input.steps)
      );
    recipeId = Number(result.lastInsertRowid);
  }
  revalidatePath("/recipes");
  revalidatePath("/");
  redirect(`/recipes/${recipeId}`);
}

/**
 * Replace a recipe's photo from a user-pasted image URL. The image is fetched
 * once, saved under /public/recipe-photos, and served locally from then on.
 */
export async function updateRecipePhotoFromUrl(
  id: number,
  url: string
): Promise<{ ok: boolean; error?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "Not a valid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "URL must be http(s)." };
  }
  const exists = db.prepare("SELECT 1 FROM recipes WHERE id = ?").get(id);
  if (!exists) return { ok: false, error: "Recipe not found." };

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return { ok: false, error: "Could not fetch that URL." };
  }
  if (!res.ok) return { ok: false, error: `Fetch failed (HTTP ${res.status}).` };
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType && !contentType.startsWith("image/")) {
    return { ok: false, error: `That URL returned ${contentType}, not an image.` };
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0) return { ok: false, error: "Empty response." };

  const dir = path.join(process.cwd(), "public", "recipe-photos");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.jpg`), bytes);
  // Cache-buster: same filename, new content.
  db.prepare("UPDATE recipes SET photo_path = ? WHERE id = ?").run(
    `/recipe-photos/${id}.jpg?v=${Date.now()}`,
    id
  );
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Preferences: cuisine mix + liked/disliked veggies
// ---------------------------------------------------------------------------

/** Save the whole cuisine mix at once. Weights are clamped to 0–100. */
export async function saveCuisinePrefs(weights: Record<string, number>) {
  const upsert = db.prepare(
    `INSERT INTO cuisine_prefs (cuisine, weight) VALUES (?, ?)
     ON CONFLICT(cuisine) DO UPDATE SET weight = excluded.weight`
  );
  const apply = db.transaction(() => {
    for (const cuisine of CUISINES) {
      const raw = Number(weights[cuisine]);
      const weight = Number.isFinite(raw) ? Math.min(100, Math.max(0, Math.round(raw))) : 0;
      upsert.run(cuisine, weight);
    }
  });
  apply();
  revalidatePath("/preferences");
  revalidatePath("/");
}

export async function addVeggiePref(name: string, sentiment: VeggieSentiment) {
  const trimmed = name.trim();
  if (!trimmed) return;
  if (sentiment !== "like" && sentiment !== "dislike") return;
  // A veggie can't be both liked and disliked — the newest choice wins.
  db.prepare("DELETE FROM veggie_prefs WHERE name = ? COLLATE NOCASE").run(trimmed);
  db.prepare(
    "INSERT OR IGNORE INTO veggie_prefs (name, sentiment) VALUES (?, ?)"
  ).run(trimmed, sentiment);
  revalidatePath("/preferences");
  revalidatePath("/recipes/new");
}

export async function removeVeggiePref(id: number) {
  db.prepare("DELETE FROM veggie_prefs WHERE id = ?").run(id);
  revalidatePath("/preferences");
  revalidatePath("/recipes/new");
}
