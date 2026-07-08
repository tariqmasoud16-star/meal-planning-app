"use client";

import { useState, useTransition } from "react";
import { saveCuisinePrefs } from "@/app/actions";
import type { CuisinePref } from "@/lib/types";

export default function CuisineMix({ prefs }: { prefs: CuisinePref[] }) {
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(prefs.map((p) => [p.cuisine, p.weight]))
  );
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const total = Object.values(weights).reduce((sum, w) => sum + (Number(w) || 0), 0);

  const set = (cuisine: string, value: number) => {
    setSaved(false);
    setWeights((prev) => ({ ...prev, [cuisine]: value }));
  };

  const save = () =>
    startTransition(async () => {
      await saveCuisinePrefs(weights);
      setSaved(true);
    });

  // Share each cuisine represents of the whole mix, for the little readout.
  const share = (w: number) => (total > 0 ? Math.round((w / total) * 100) : 0);

  return (
    <div className="max-w-2xl rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="text-base font-semibold">Cuisine mix</h2>
      <p className="mt-0.5 mb-4 text-sm text-stone-500">
        Set how often you want to cook each cuisine. The weights are relative — the weekly
        planner uses them to aim for this balance.
      </p>

      <div className="space-y-3">
        {prefs.map((p) => {
          const w = weights[p.cuisine] ?? 0;
          return (
            <div key={p.cuisine} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm font-medium">{p.cuisine}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={w}
                onChange={(e) => set(p.cuisine, Number(e.target.value))}
                className="flex-1 accent-emerald-600"
                aria-label={`${p.cuisine} weight`}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={w}
                onChange={(e) => set(p.cuisine, Number(e.target.value))}
                className="w-16 rounded border border-stone-300 bg-white px-2 py-1 text-sm"
              />
              <span className="w-14 shrink-0 text-right text-xs text-stone-500">
                {share(w)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save cuisine mix"}
        </button>
        {total === 0 && (
          <span className="text-xs text-stone-500">
            All zero — the planner will spread cuisines evenly.
          </span>
        )}
        {saved && !pending && <span className="text-xs text-emerald-700">✓ Saved</span>}
      </div>
    </div>
  );
}
