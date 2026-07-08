// ---------------------------------------------------------------------------
// Single source of truth for the dietary profile.
// Edit this file to change what the app warns about, suggests, and tips.
// ---------------------------------------------------------------------------

import type { Cuisine, Method } from "./types";

export const CUISINES: Cuisine[] = ["Middle Eastern", "Italian", "Indian", "Asian"];

export const METHODS: Method[] = ["baked", "steamed", "stovetop", "raw", "omelette"];

// Target ceiling for active cooking time (minutes).
export const MAX_ACTIVE_MINUTES = 30;

export const PROFILE = {
  diet: "vegetarian", // eggs OK occasionally, no fish, no meat
  eggsOk: true,
  noFried: true, // high cholesterol: baked/steamed/light sauté only
  favor: ["high fiber", "plant protein"],
  likes: ["potato", "chickpeas", "tomato", "broccoli", "beans", "spinach", "cheese"],
} as const;

export type WarningLevel = "never" | "avoid" | "note";

export interface ConstraintRule {
  // Regex matched case-insensitively against ingredient names / recipe text.
  pattern: RegExp;
  label: string;
  level: WarningLevel;
  reason: string;
}

// NEVER: hard exclusions (allergy-level strictness).
// AVOID: strong dislikes.
// NOTE: allowed with care.
export const CONSTRAINT_RULES: ConstraintRule[] = [
  { pattern: /\bonions?\b|\bscallions?\b|\bshallots?\b|\bspring onions?\b/i, label: "onion", level: "never", reason: "Never: onions (any kind)" },
  { pattern: /\bmushrooms?\b|\bshiitake\b|\bporcini\b|\bportobello\b/i, label: "mushroom", level: "never", reason: "Never: mushrooms" },
  { pattern: /\bfish\b|\btuna\b|\bsalmon\b|\banchov\w*\b|\bshrimp\b|\bprawns?\b|\bseafood\b|\bcod\b|\bsardines?\b/i, label: "fish/seafood", level: "never", reason: "Vegetarian: no fish or seafood" },
  { pattern: /\bmeat\b|\bchicken\b|\bbeef\b|\bpork\b|\blamb\b|\bbacon\b|\bham\b|\bsausages?\b|\bturkey\b|\bmince\b/i, label: "meat", level: "never", reason: "Vegetarian: no meat" },
  { pattern: /\beggplants?\b|\baubergines?\b/i, label: "eggplant", level: "avoid", reason: "Dislike: eggplant" },
  { pattern: /\blentils?\b|\bdal\b|\bdaal\b|\bdhal\b/i, label: "lentils", level: "avoid", reason: "Dislike: lentils" },
  { pattern: /\bpaprika\b|\bbell peppers?\b|\bcapsicum\b/i, label: "paprika/bell pepper", level: "avoid", reason: "Dislike: paprika and bell pepper" },
  { pattern: /\bgarlic\b/i, label: "garlic", level: "note", reason: "Garlic OK only in small amounts" },
];

export interface ConstraintWarning {
  level: WarningLevel;
  label: string;
  reason: string;
  found_in: string;
}

// Strip allowed light-sauté phrasing before checking for fried food.
const FRIED_PATTERN = /\bdeep[- ]?fr(y|ied|ying)\b|\bfr(y|ied|ying)\b/i;
const ALLOWED_FRY_PHRASES = /stir[- ]?fr(y|ied|ying)|air[- ]?fr(y|ied|ying)/gi;

export function checkFried(text: string): boolean {
  return FRIED_PATTERN.test(text.replace(ALLOWED_FRY_PHRASES, ""));
}

/** Veggies the cook has personally marked as liked/disliked (from Preferences). */
export interface VeggieProfile {
  likes: string[];
  dislikes: string[];
}

/** Whole-word, case-insensitive match of a veggie name inside an ingredient. */
function mentions(ingredient: string, veggie: string): boolean {
  const escaped = veggie.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return false;
  return new RegExp(`\\b${escaped}\\b`, "i").test(ingredient);
}

/**
 * Validate a list of ingredient names (plus optional title/steps text)
 * against the dietary profile. Returns warnings; never blocks. Pass the cook's
 * saved veggie likes/dislikes to fold personal preferences into the results.
 */
export function validateIngredients(
  ingredientNames: string[],
  extraText: string = "",
  veggies: VeggieProfile = { likes: [], dislikes: [] }
): ConstraintWarning[] {
  const warnings: ConstraintWarning[] = [];
  for (const name of ingredientNames) {
    for (const rule of CONSTRAINT_RULES) {
      if (rule.pattern.test(name)) {
        warnings.push({ level: rule.level, label: rule.label, reason: rule.reason, found_in: name });
      }
    }
    for (const disliked of veggies.dislikes) {
      if (mentions(name, disliked)) {
        warnings.push({
          level: "avoid",
          label: disliked,
          reason: `You marked ${disliked} as a veggie you don't like`,
          found_in: name,
        });
      }
    }
  }
  const allText = [extraText, ...ingredientNames].join(" ");
  if (checkFried(allText)) {
    warnings.push({
      level: "never",
      label: "fried",
      reason: "High cholesterol: no fried dishes (baked/steamed/light sauté only)",
      found_in: extraText || "ingredients",
    });
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Eat-out tips: what to order per cuisine as a vegetarian avoiding fried food
// and onions. Static, hard-coded — no external calls.
// ---------------------------------------------------------------------------

export const EAT_OUT_TIPS: Record<string, string> = {
  Indian:
    "Order palak paneer or chana masala; ask for no onion. Skip fried starters (samosa, pakora, bhaji).",
  Italian:
    "Pasta al pomodoro, caprese, or margherita; ask for no onion in the sauce. Skip anything 'fritto'.",
  "Middle Eastern":
    "Hummus plate, foul, or baked falafel (skip if deep-fried); ask for salads without onion.",
  Asian:
    "Steamed tofu or veggie sushi, edamame, veggie soba; ask for steamed not fried, no onion or mushroom.",
  Other:
    "Look for a baked or grilled vegetarian main with beans or cheese; ask for no onion and nothing fried.",
};

export function eatOutTip(cuisine: string): string {
  return EAT_OUT_TIPS[cuisine] ?? EAT_OUT_TIPS.Other;
}
