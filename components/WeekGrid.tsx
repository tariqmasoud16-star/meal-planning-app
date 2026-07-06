"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  assignRecipe,
  clearSlot,
  markEatOut,
  markLeftovers,
  planWeek,
  rerollDinner,
  type WeekKey,
} from "@/app/actions";
import { CUISINES, eatOutTip } from "@/lib/constraints";
import { dayLabel } from "@/lib/week";
import { parseEatOutNote, type PlanEntry, type Recipe } from "@/lib/types";
import type { LunchSuggestion } from "@/lib/lunch";
import RecipePhoto from "./RecipePhoto";

export default function WeekGrid({
  week,
  dates,
  plan,
  recipes,
  today,
  lunches,
}: {
  week: WeekKey;
  dates: string[];
  plan: PlanEntry[];
  recipes: Recipe[];
  today: string;
  lunches: LunchSuggestion[];
}) {
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [eatOutDate, setEatOutDate] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const planMap = useMemo(() => {
    const m = new Map<string, PlanEntry>();
    for (const e of plan) if (e.slot === "dinner") m.set(e.date, e);
    return m;
  }, [plan]);

  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const act = (fn: () => Promise<void>) => startTransition(() => fn());

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={() => act(() => planWeek(week))}
          disabled={pending}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Working…" : week === "next" ? "✨ Plan next week" : "✨ Plan this week"}
        </button>
        <span className="text-xs text-stone-500">
          Fills proposed cells only — manual picks, eat-out and leftovers stay put.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              <th className="w-14"></th>
              {dates.map((d) => (
                <th
                  key={d}
                  className={`border border-stone-200 px-1 py-1.5 text-xs font-semibold ${
                    d === today ? "bg-emerald-100 text-emerald-900" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {dayLabel(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-stone-200 bg-stone-100 px-1 text-center text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                lunch idea
              </td>
              {dates.map((d, i) => (
                <td
                  key={d}
                  className="border border-stone-200 bg-stone-50 px-1.5 py-1 align-top"
                  title={lunches[i]?.detail}
                >
                  <p className="line-clamp-2 text-[10px] italic leading-snug text-stone-500">
                    {lunches[i]?.label}
                  </p>
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-stone-200 bg-stone-100 px-1 text-center text-xs font-semibold uppercase tracking-wide text-stone-500">
                dinner
              </td>
              {dates.map((date) => (
                <DinnerCell
                  key={date}
                  date={date}
                  muted={date < today}
                  entry={planMap.get(date) ?? null}
                  recipeMap={recipeMap}
                  onPick={() => setPickerDate(date)}
                  onEatOut={() => setEatOutDate(date)}
                  onLeftovers={() => act(() => markLeftovers(date))}
                  onReroll={() => act(() => rerollDinner(date))}
                  onClear={() => act(() => clearSlot(date))}
                />
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {pickerDate && (
        <RecipePicker
          recipes={recipes}
          onSelect={(id) => {
            const date = pickerDate;
            setPickerDate(null);
            act(() => assignRecipe(date, id));
          }}
          onClose={() => setPickerDate(null)}
        />
      )}

      {eatOutDate && (
        <EatOutDialog
          onSave={(cuisine, note) => {
            const date = eatOutDate;
            setEatOutDate(null);
            act(() => markEatOut(date, cuisine, note));
          }}
          onClose={() => setEatOutDate(null)}
        />
      )}
    </div>
  );
}

function DinnerCell({
  date,
  muted,
  entry,
  recipeMap,
  onPick,
  onEatOut,
  onLeftovers,
  onReroll,
  onClear,
}: {
  date: string;
  muted: boolean;
  entry: PlanEntry | null;
  recipeMap: Map<number, Recipe>;
  onPick: () => void;
  onEatOut: () => void;
  onLeftovers: () => void;
  onReroll: () => void;
  onClear: () => void;
}) {
  const btn =
    "rounded px-1.5 py-0.5 text-[11px] font-medium bg-stone-100 text-stone-600 hover:bg-emerald-100 hover:text-emerald-800";

  let body: React.ReactNode;
  if (!entry) {
    body = (
      <div className="flex min-h-36 flex-col items-stretch justify-center gap-1 p-1">
        <button onClick={onReroll} className={btn} title="Propose a recipe for this night">
          🎲 Propose
        </button>
        <button onClick={onPick} className={btn} title="Pick from the library">
          + Pick
        </button>
        <div className="flex gap-1">
          <button onClick={onEatOut} className={`${btn} flex-1`}>
            Eat out
          </button>
          <button onClick={onLeftovers} className={`${btn} flex-1`}>
            Leftovers
          </button>
        </div>
      </div>
    );
  } else if (entry.entry_type === "cook" && entry.recipe_id) {
    const r = recipeMap.get(entry.recipe_id);
    const isManual = entry.fill_method === "manual";
    body = (
      <div className="flex min-h-36 flex-col gap-1 p-1.5">
        {r && (
          <RecipePhoto
            photoPath={r.photo_path}
            cuisine={r.cuisine}
            title={r.title}
            className="h-14 w-full rounded"
          />
        )}
        <Link
          href={`/recipes/${entry.recipe_id}`}
          className="text-xs font-semibold leading-tight text-emerald-800 hover:underline"
        >
          {r?.title ?? "Unknown recipe"}
        </Link>
        {r && (
          <div className="text-[10px] text-stone-500">
            {r.cuisine} · {r.protein_grams_estimate}g protein · {r.active_minutes} min
            {isManual && (
              <span
                className="ml-1 rounded bg-sky-100 px-1 py-px text-[9px] font-semibold text-sky-700"
                title="Manual pick — Plan my week and reroll won't touch it"
              >
                🔒 manual
              </span>
            )}
          </div>
        )}
        <CellFooter
          reroll={!isManual ? onReroll : undefined}
          onPick={onPick}
          onEatOut={onEatOut}
          onLeftovers={onLeftovers}
          onClear={onClear}
        />
      </div>
    );
  } else if (entry.entry_type === "eat_out") {
    const info = parseEatOutNote(entry.eat_out_note);
    body = (
      <div className="flex min-h-36 flex-col gap-1 p-1.5">
        <div className="text-xs font-semibold text-amber-700">
          🍽 Eat out{info.cuisine ? ` · ${info.cuisine}` : ""}{" "}
          <span
            className="rounded bg-amber-100 px-1 py-px text-[9px] font-semibold"
            title="Locked — Plan my week and reroll won't touch it"
          >
            🔒
          </span>
        </div>
        {info.note && <div className="text-[11px] text-stone-600">{info.note}</div>}
        <div className="text-[10px] italic leading-snug text-stone-500" data-testid="eat-out-tip">
          💡 {eatOutTip(info.cuisine)}
        </div>
        <CellFooter onPick={onPick} onEatOut={onEatOut} onLeftovers={onLeftovers} onClear={onClear} />
      </div>
    );
  } else {
    body = (
      <div className="flex min-h-36 flex-col gap-1 p-1.5">
        <div className="text-xs font-semibold text-sky-700">♻ Leftovers</div>
        <CellFooter onPick={onPick} onEatOut={onEatOut} onLeftovers={onLeftovers} onClear={onClear} />
      </div>
    );
  }

  return (
    <td
      className={`border border-stone-200 bg-white align-top ${muted ? "opacity-50" : ""}`}
      data-cell={`${date}-dinner`}
    >
      {body}
    </td>
  );
}

function CellFooter({
  reroll,
  onPick,
  onEatOut,
  onLeftovers,
  onClear,
}: {
  reroll?: () => void;
  onPick: () => void;
  onEatOut: () => void;
  onLeftovers: () => void;
  onClear: () => void;
}) {
  const tiny = "rounded px-1 text-[10px] text-stone-400 hover:bg-stone-100 hover:text-stone-700";
  return (
    <div className="mt-auto flex flex-wrap gap-0.5">
      {reroll && (
        <button onClick={reroll} className={tiny} title="Reroll: different recipe for this night" data-action="reroll">
          🎲
        </button>
      )}
      <button onClick={onPick} className={tiny} title="Pick from library">
        pick
      </button>
      <button onClick={onEatOut} className={tiny} title="Mark eat out">
        eat out
      </button>
      <button onClick={onLeftovers} className={tiny} title="Mark leftovers">
        leftovers
      </button>
      <button onClick={onClear} className={`${tiny} ml-auto`} title="Clear cell">
        ✕
      </button>
    </div>
  );
}

function RecipePicker({
  recipes,
  onSelect,
  onClose,
}: {
  recipes: Recipe[];
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [cuisine, setCuisine] = useState<string>("");
  const [sort, setSort] = useState<"minutes" | "protein">("minutes");

  const shown = recipes
    .filter((r) => !cuisine || r.cuisine === cuisine)
    .sort((a, b) =>
      sort === "minutes"
        ? a.active_minutes - b.active_minutes
        : b.protein_grams_estimate - a.protein_grams_estimate
    );

  return (
    <Modal onClose={onClose} title="Pick a recipe (manual — locked against rerolls)">
      <div className="mb-2 flex items-center gap-2">
        <select
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
          className="rounded border border-stone-300 px-2 py-1 text-sm"
        >
          <option value="">All cuisines</option>
          {CUISINES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "minutes" | "protein")}
          className="rounded border border-stone-300 px-2 py-1 text-sm"
        >
          <option value="minutes">Fastest first</option>
          <option value="protein">Most protein first</option>
        </select>
      </div>
      <ul className="max-h-96 divide-y divide-stone-100 overflow-y-auto">
        {shown.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => onSelect(r.id)}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-emerald-50"
            >
              <RecipePhoto
                photoPath={r.photo_path}
                cuisine={r.cuisine}
                title={r.title}
                className="h-8 w-12 shrink-0 rounded"
              />
              <span className="flex-1 text-sm font-medium">{r.title}</span>
              <span className="shrink-0 text-xs text-stone-500">
                {r.cuisine} · {r.protein_grams_estimate}g · {r.active_minutes} min
              </span>
            </button>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="px-2 py-4 text-sm text-stone-500">No recipes match.</li>
        )}
      </ul>
    </Modal>
  );
}

function EatOutDialog({
  onSave,
  onClose,
}: {
  onSave: (cuisine: string, note: string) => void;
  onClose: () => void;
}) {
  const [cuisine, setCuisine] = useState<string>("Middle Eastern");
  const [note, setNote] = useState("");

  return (
    <Modal onClose={onClose} title="Eat out">
      <div className="flex flex-col gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Cuisine</span>
          <select
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="w-full rounded border border-stone-300 px-2 py-1"
          >
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Note (place, occasion…)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border border-stone-300 px-2 py-1"
            placeholder="e.g. Luigi's with Sam"
          />
        </label>
        <p className="rounded bg-amber-50 px-2 py-1.5 text-xs italic text-amber-800">
          💡 {eatOutTip(cuisine)}
        </p>
        <button
          onClick={() => onSave(cuisine, note)}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
