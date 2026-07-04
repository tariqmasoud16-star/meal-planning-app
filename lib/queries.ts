import { db } from "./db";
import type { Ingredient, PlanEntry, Recipe } from "./types";

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
