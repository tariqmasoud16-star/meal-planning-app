import { db } from "./db";
import { CUISINES } from "./constraints";
import type { CuisinePref, Ingredient, PlanEntry, Recipe, VeggiePref } from "./types";

interface RecipeRow extends Omit<Recipe, "ingredients" | "steps"> {
  ingredients: string;
  steps: string;
}

function hydrate(row: RecipeRow): Recipe {
  return {
    ...row,
    ingredients: JSON.parse(row.ingredients) as Ingredient[],
    steps: JSON.parse(row.steps) as string[],
  };
}

export interface RecipeFilters {
  cuisine?: string;
  maxMinutes?: number;
  minProtein?: number;
}

export function getRecipes(filters: RecipeFilters = {}): Recipe[] {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filters.cuisine) {
    clauses.push("cuisine = ?");
    params.push(filters.cuisine);
  }
  if (filters.maxMinutes !== undefined && !Number.isNaN(filters.maxMinutes)) {
    clauses.push("active_minutes <= ?");
    params.push(filters.maxMinutes);
  }
  if (filters.minProtein !== undefined && !Number.isNaN(filters.minProtein)) {
    clauses.push("protein_grams_estimate >= ?");
    params.push(filters.minProtein);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM recipes ${where} ORDER BY active_minutes ASC, title ASC`)
    .all(...params) as RecipeRow[];
  return rows.map(hydrate);
}

export function getRecipe(id: number): Recipe | null {
  const row = db.prepare("SELECT * FROM recipes WHERE id = ?").get(id) as RecipeRow | undefined;
  return row ? hydrate(row) : null;
}

export function getWeekPlan(dates: string[]): PlanEntry[] {
  const placeholders = dates.map(() => "?").join(",");
  return db
    .prepare(`SELECT * FROM week_plan WHERE date IN (${placeholders})`)
    .all(...dates) as PlanEntry[];
}

/**
 * Cuisine weights for every cuisine in the profile, defaulting to 0 for any
 * the cook hasn't set yet. Always returns one row per known cuisine so the
 * editor can render a complete form.
 */
export function getCuisinePrefs(): CuisinePref[] {
  const rows = db.prepare("SELECT cuisine, weight FROM cuisine_prefs").all() as {
    cuisine: string;
    weight: number;
  }[];
  const stored = new Map(rows.map((r) => [r.cuisine, r.weight]));
  return CUISINES.map((cuisine) => ({ cuisine, weight: stored.get(cuisine) ?? 0 }));
}

export function getVeggiePrefs(): VeggiePref[] {
  return db
    .prepare("SELECT id, name, sentiment FROM veggie_prefs ORDER BY sentiment ASC, name ASC")
    .all() as VeggiePref[];
}

/** Liked/disliked veggie names, shaped for constraint validation. */
export function getVeggieProfile(): { likes: string[]; dislikes: string[] } {
  const prefs = getVeggiePrefs();
  return {
    likes: prefs.filter((p) => p.sentiment === "like").map((p) => p.name),
    dislikes: prefs.filter((p) => p.sentiment === "dislike").map((p) => p.name),
  };
}
