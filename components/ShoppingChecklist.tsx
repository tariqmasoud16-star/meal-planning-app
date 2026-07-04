"use client";

import { useState } from "react";
import type { IngredientCategory } from "@/lib/types";

export interface ShoppingItem {
  name: string;
  unit: string;
  amount: number;
  category: IngredientCategory;
}

const GROUP_LABELS: Record<IngredientCategory, string> = {
  produce: "🥬 Produce",
  dairy: "🧀 Dairy & eggs",
  pantry: "🫙 Pantry",
};

function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export default function ShoppingChecklist({
  groups,
}: {
  groups: Record<IngredientCategory, ShoppingItem[]>;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-5">
      {(Object.keys(GROUP_LABELS) as IngredientCategory[]).map((cat) => {
        const items = groups[cat];
        if (!items || items.length === 0) return null;
        return (
          <section key={cat} className="shopping-section">
            <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-stone-500">
              {GROUP_LABELS[cat]}
            </h2>
            <ul className="shopping-list divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
              {items.map((item) => {
                const key = `${item.name}|${item.unit}`;
                const isChecked = checked.has(key);
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-stone-50">
                      {/* Empty square for paper; the live input is hidden on print. */}
                      <span className="print-square" aria-hidden="true" />
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(key)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      <span className={isChecked ? "text-stone-400 line-through" : ""}>
                        <strong>
                          {formatAmount(item.amount)} {item.unit}
                        </strong>{" "}
                        {item.name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
