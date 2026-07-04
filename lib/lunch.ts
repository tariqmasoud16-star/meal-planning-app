// Static lunch suggestion line — read-only, no DB, no planning.
// Alternates per day between a supermarket grab and an eat-out idea,
// deterministically keyed on the date. All options fit the profile:
// vegetarian, high protein, not fried, no onion/mushroom.

import { CUISINES, EAT_OUT_TIPS } from "./constraints";

export const SUPERMARKET_LUNCHES: string[] = [
  "Hüttenkäse (cottage cheese) + cherry tomatoes + crackers",
  "Skyr or quark bowl with almonds",
  "Hummus + whole-grain bread + cucumber",
  "Mozzarella + tomato + basil (quick caprese)",
  "Hard-boiled eggs + whole-grain roll",
  "Onion-free bean salad (canned mixed beans + lemon + olive oil)",
  "Greek yogurt + walnuts + fruit",
  "Edamame snack pack + cheese cubes",
  "Ricotta on rye with tomato slices",
  "Tofu deli slices in a whole-grain sandwich",
];

export interface LunchSuggestion {
  kind: "supermarket" | "eat_out";
  label: string; // short line for the cell
  detail: string; // full text for the tooltip
}

// Stable day ordinal so the rotation survives reloads and never calls Date.
function dateKey(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return y * 372 + m * 31 + d;
}

export function lunchSuggestion(isoDate: string): LunchSuggestion {
  const key = dateKey(isoDate);
  if (key % 2 === 0) {
    const pick = SUPERMARKET_LUNCHES[key % SUPERMARKET_LUNCHES.length];
    return { kind: "supermarket", label: `🛒 ${pick}`, detail: `Supermarket grab: ${pick}` };
  }
  const cuisine = CUISINES[key % CUISINES.length];
  const tip = EAT_OUT_TIPS[cuisine];
  return {
    kind: "eat_out",
    label: `🍽 Eat out (${cuisine}): ${tip}`,
    detail: `Eat-out idea (${cuisine}): ${tip}`,
  };
}
