// ---------------------------------------------------------------------------
// Dinner proposal engine. All selection rules live here:
//   1. No recipe repeats within the week.
//   2. No cuisine appears more than 2 nights in a row.
//   3. Mix of active_minutes — balance quick/medium/long across the week.
// Pure functions over plain data; callers own all DB access.
// ---------------------------------------------------------------------------

export interface ProposalRecipe {
  id: number;
  cuisine: string;
  active_minutes: number;
}

export interface ProposalDay {
  date: string;
  /** Locked cells (manual pick, eat-out, leftovers) are never overwritten. */
  locked: boolean;
  /** Recipe currently occupying this night's cook cell, if any. */
  recipeId: number | null;
}

export const MAX_CUISINE_RUN = 2;

type Bucket = "quick" | "medium" | "long";

export function minuteBucket(activeMinutes: number): Bucket {
  if (activeMinutes <= 15) return "quick";
  if (activeMinutes < 25) return "medium";
  return "long";
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Would placing `cuisine` at position i create a run longer than MAX_CUISINE_RUN? */
function createsRun(cuisines: (string | null)[], i: number, cuisine: string): boolean {
  const seq = cuisines.slice();
  seq[i] = cuisine;
  const runLen = MAX_CUISINE_RUN + 1;
  for (let s = Math.max(0, i - MAX_CUISINE_RUN); s <= Math.min(i, seq.length - runLen); s++) {
    let all = true;
    for (let k = s; k < s + runLen; k++) {
      if (seq[k] !== cuisine) {
        all = false;
        break;
      }
    }
    if (all) return true;
  }
  return false;
}

/**
 * Propose recipes for every non-locked day. Locked days constrain the result
 * (their recipes count as used; their cuisines count toward runs) but are
 * never assigned. Returns date → recipeId for the days that were filled.
 */
export function proposeWeek(
  days: ProposalDay[],
  recipes: ProposalRecipe[]
): Map<string, number> {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const lockedRecipe = (d: ProposalDay) =>
    d.locked && d.recipeId ? byId.get(d.recipeId) ?? null : null;

  const cuisines: (string | null)[] = days.map((d) => lockedRecipe(d)?.cuisine ?? null);
  const used = new Set<number>();
  const bucketCount: Record<Bucket, number> = { quick: 0, medium: 0, long: 0 };
  const cuisineCount = new Map<string, number>();

  for (const d of days) {
    const r = lockedRecipe(d);
    if (!r) continue;
    used.add(r.id);
    bucketCount[minuteBucket(r.active_minutes)]++;
    cuisineCount.set(r.cuisine, (cuisineCount.get(r.cuisine) ?? 0) + 1);
  }

  const assignments = new Map<string, number>();
  days.forEach((day, i) => {
    if (day.locked) return;
    let candidates = shuffle(
      recipes.filter((r) => !used.has(r.id) && !createsRun(cuisines, i, r.cuisine))
    );
    if (candidates.length === 0) {
      // Library too small to honor the cuisine-run rule — relax it, never duplicate.
      candidates = shuffle(recipes.filter((r) => !used.has(r.id)));
    }
    if (candidates.length === 0) return;

    // Stable sort over a shuffled list: prefer the least-used time bucket,
    // then the least-used cuisine; ties stay random.
    candidates.sort(
      (a, b) =>
        bucketCount[minuteBucket(a.active_minutes)] -
          bucketCount[minuteBucket(b.active_minutes)] ||
        (cuisineCount.get(a.cuisine) ?? 0) - (cuisineCount.get(b.cuisine) ?? 0)
    );
    const pick = candidates[0];

    assignments.set(day.date, pick.id);
    used.add(pick.id);
    cuisines[i] = pick.cuisine;
    bucketCount[minuteBucket(pick.active_minutes)]++;
    cuisineCount.set(pick.cuisine, (cuisineCount.get(pick.cuisine) ?? 0) + 1);
  });

  return assignments;
}

/**
 * Pick a replacement recipe for one day, holding the other six fixed.
 * Never returns the day's current recipe or any recipe used elsewhere
 * in the week; obeys the cuisine-run rule against its neighbors.
 */
export function rerollDay(
  days: ProposalDay[],
  targetDate: string,
  recipes: ProposalRecipe[]
): number | null {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const i = days.findIndex((d) => d.date === targetDate);
  if (i < 0) return null;

  const currentId = days[i].recipeId;
  const used = new Set<number>();
  for (const d of days) {
    if (d.date !== targetDate && d.recipeId) used.add(d.recipeId);
  }
  const cuisines: (string | null)[] = days.map((d) =>
    d.date === targetDate ? null : d.recipeId ? byId.get(d.recipeId)?.cuisine ?? null : null
  );

  let candidates = shuffle(
    recipes.filter(
      (r) => !used.has(r.id) && r.id !== currentId && !createsRun(cuisines, i, r.cuisine)
    )
  );
  if (candidates.length === 0) {
    candidates = shuffle(recipes.filter((r) => !used.has(r.id) && r.id !== currentId));
  }
  if (candidates.length === 0) return null;

  // Prefer a time bucket underrepresented in the rest of the week; keep the
  // final choice random within that bucket.
  const bucketCount: Record<Bucket, number> = { quick: 0, medium: 0, long: 0 };
  for (const id of used) {
    const r = byId.get(id);
    if (r) bucketCount[minuteBucket(r.active_minutes)]++;
  }
  candidates.sort(
    (a, b) =>
      bucketCount[minuteBucket(a.active_minutes)] - bucketCount[minuteBucket(b.active_minutes)]
  );
  const bestBucketUse = bucketCount[minuteBucket(candidates[0].active_minutes)];
  const pool = candidates.filter(
    (c) => bucketCount[minuteBucket(c.active_minutes)] === bestBucketUse
  );
  return pool[Math.floor(Math.random() * pool.length)].id;
}
