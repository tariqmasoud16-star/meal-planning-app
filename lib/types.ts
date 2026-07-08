export type Cuisine = "Middle Eastern" | "Italian" | "Indian" | "Asian";

export type Method = "baked" | "steamed" | "stovetop" | "raw" | "omelette";

export type IngredientCategory = "produce" | "pantry" | "dairy";

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  category: IngredientCategory;
}

export type RecipeSource = "seed" | "manual" | "ai";

export interface Recipe {
  id: number;
  title: string;
  cuisine: Cuisine;
  protein_grams_estimate: number;
  active_minutes: number;
  method: Method;
  ingredients: Ingredient[];
  steps: string[];
  source: RecipeSource;
  photo_path: string | null;
}

export type EntryType = "cook" | "eat_out" | "leftovers";

// How a cell got filled. Seam only — no analytics built on this.
export type FillMethod = "proposed" | "manual" | "eat_out" | "leftovers";

export interface PlanEntry {
  id: number;
  date: string; // YYYY-MM-DD
  slot: "dinner"; // lunch is no longer plannable
  entry_type: EntryType;
  recipe_id: number | null;
  eat_out_note: string | null; // JSON: { cuisine, note }
  fill_method: FillMethod;
}

export interface EatOutInfo {
  cuisine: string;
  note: string;
}

// How often the cook wants each cuisine, as a relative 0–100 weight.
export interface CuisinePref {
  cuisine: Cuisine;
  weight: number;
}

export type VeggieSentiment = "like" | "dislike";

export interface VeggiePref {
  id: number;
  name: string;
  sentiment: VeggieSentiment;
}

export function parseEatOutNote(raw: string | null): EatOutInfo {
  if (!raw) return { cuisine: "", note: "" };
  try {
    const parsed = JSON.parse(raw);
    return { cuisine: parsed.cuisine ?? "", note: parsed.note ?? "" };
  } catch {
    return { cuisine: "", note: raw };
  }
}
