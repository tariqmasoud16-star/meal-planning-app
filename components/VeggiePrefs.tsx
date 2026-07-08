"use client";

import { useState, useTransition } from "react";
import { addVeggiePref, removeVeggiePref } from "@/app/actions";
import type { VeggiePref, VeggieSentiment } from "@/lib/types";

export default function VeggiePrefs({ prefs }: { prefs: VeggiePref[] }) {
  const likes = prefs.filter((p) => p.sentiment === "like");
  const dislikes = prefs.filter((p) => p.sentiment === "dislike");

  return (
    <div className="max-w-2xl rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="text-base font-semibold">Veggies</h2>
      <p className="mt-0.5 mb-4 text-sm text-stone-500">
        List the vegetables you love and the ones you'd rather skip. Dislikes show up as a
        warning when a recipe uses them.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <VeggieColumn
          title="Veggies I like"
          accent="emerald"
          sentiment="like"
          items={likes}
        />
        <VeggieColumn
          title="Veggies I don't like"
          accent="rose"
          sentiment="dislike"
          items={dislikes}
        />
      </div>
    </div>
  );
}

const ACCENTS = {
  emerald: {
    chip: "bg-emerald-50 border-emerald-200 text-emerald-800",
    button: "bg-emerald-600 hover:bg-emerald-700",
  },
  rose: {
    chip: "bg-rose-50 border-rose-200 text-rose-800",
    button: "bg-rose-600 hover:bg-rose-700",
  },
} as const;

function VeggieColumn({
  title,
  accent,
  sentiment,
  items,
}: {
  title: string;
  accent: keyof typeof ACCENTS;
  sentiment: VeggieSentiment;
  items: VeggiePref[];
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const styles = ACCENTS[accent];

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addVeggiePref(trimmed, sentiment);
      setName("");
    });
  };

  const remove = (id: number) => startTransition(() => removeVeggiePref(id));

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="flex gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. broccoli"
          className="flex-1 rounded border border-stone-300 bg-white px-2 py-1 text-sm"
        />
        <button
          onClick={add}
          disabled={pending || !name.trim()}
          className={`rounded px-3 py-1 text-sm font-semibold text-white disabled:opacity-50 ${styles.button}`}
        >
          Add
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map((v) => (
          <span
            key={v.id}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm ${styles.chip}`}
          >
            {v.name}
            <button
              onClick={() => remove(v.id)}
              disabled={pending}
              className="text-current opacity-60 hover:opacity-100"
              title={`Remove ${v.name}`}
            >
              ✕
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-stone-400">Nothing added yet.</span>
        )}
      </div>
    </div>
  );
}
