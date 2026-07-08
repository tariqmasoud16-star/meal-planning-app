// ---------------------------------------------------------------------------
// Dinner proposal engine. All selection rules live here:
//   1. No recipe repeats within the no-repeat window. The window is every day
//      the caller wants kept distinct — this week's cells plus any recipe ids
//      passed in `excludeIds` (e.g. the other visible week). Callers pass the
//      excluded set in rather than the engine querying it.
//   2. No cuisine appears more than 2 nights in a row (within-week only).
//   3. Mix of active_minutes — balance quick/medium/long across the week.
//   4. Cuisine mix — when the cook has set cuisine weights, favor whichever
//      cuisine is furthest below its target share; otherwise spread evenly.
// Pure functions over plain data; callers own all DB access.
// ---------------------------------------------------------------------------

export interface ProposalRecipe {
  id: number;
  cuisine: string;
  active_minutes: number;
}

/** Relative 0–100 weight per cuisine. Empty (or all-zero) means "no preference". */
export type CuisineWeights = Map<string, number>;

/**
 * Rank a cuisine for selection — lower is picked sooner. With no weights set we
 * fall back to plain least-used balancing (the original behavior). With weights
 * set we prefer the cuisine whose current count is furthest below its target
 * share: (count + 1) / weight. A zero-weight cuisine is deprioritized but never
 * hard-blocked, so the engine can still fill a week if the library is thin.
 */
function cuisineRank(
  cuisine: string,
  cuisineCount: Map<string, number>,
  weights: CuisineWeights
): number {
  const count = cuisineCount.get(cuisine) ?? 0;
  let total = 0;
  for (const w of weights.values()) total += w;
  if (total <= 0) return count;
  const weight = weights.get(cuisine) ?? 0;
  if (weight <= 0) return Number.MAX_SAFE_INTEGER + count;
  return (count + 1) / weight;
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
  recipes: ProposalRecipe[],
  excludeIds: Iterable<number> = [],
  cuisineWeights: CuisineWeights = new Map()
): Map<string, number> {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const lockedRecipe = (d: ProposalDay) =>
    d.locked && d.recipeId ? byId.get(d.recipeId) ?? null : null;

  const cuisines: (string | null)[] = days.map((d) => lockedRecipe(d)?.cuisine ?? null);
  // `used` drives both the no-repeat filter and the within-week bucket/cuisine
  // balancing, and is seeded only from locked days. `excluded` (the other
  // week's recipes) blocks repeats without skewing the within-week balance.
  const used = new Set<number>();
  const excluded = new Set<number>(excludeIds);
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
      recipes.filter(
        (r) => !used.has(r.id) && !excluded.has(r.id) && !createsRun(cuisines, i, r.cuisine)
      )
    );
    if (candidates.length === 0) {
      // Library too small to honor the cuisine-run rule — relax it, never duplicate.
      candidates = shuffle(recipes.filter((r) => !used.has(r.id) && !excluded.has(r.id)));
    }
    if (candidates.length === 0) return;

    // Stable sort over a shuffled list: prefer the least-used time bucket,
    // then the cuisine furthest below its target share (or least-used cuisine
    // when no weights are set); ties stay random.
    candidates.sort(
      (a, b) =>
        bucketCount[minuteBucket(a.active_minutes)] -
          bucketCount[minuteBucket(b.active_minutes)] ||
        cuisineRank(a.cuisine, cuisineCount, cuisineWeights) -
          cuisineRank(b.cuisine, cuisineCount, cuisineWeights)
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
 * Never returns the day's current recipe, any recipe used elsewhere in the
 * week, or any recipe in `excludeIds` (the other visible week); obeys the
 * cuisine-run rule against its neighbors.
 */
export function rerollDay(
  days: ProposalDay[],
  targetDate: string,
  recipes: ProposalRecipe[],
  excludeIds: Iterable<number> = [],
  cuisineWeights: CuisineWeights = new Map()
): number | null {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const i = days.findIndex((d) => d.date === targetDate);
  if (i < 0) return null;

  const currentId = days[i].recipeId;
  // This week's other cells: block repeats AND drive the bucket balancing.
  const used = new Set<number>();
  for (const d of days) {
    if (d.date !== targetDate && d.recipeId) used.add(d.recipeId);
  }
  // The other week: block repeats only, never counted toward within-week balance.
  const excluded = new Set<number>(excludeIds);
  const cuisines: (string | null)[] = days.map((d) =>
    d.date === targetDate ? null : d.recipeId ? byId.get(d.recipeId)?.cuisine ?? null : null
  );

  let candidates = shuffle(
    recipes.filter(
      (r) =>
        !used.has(r.id) &&
        !excluded.has(r.id) &&
        r.id !== currentId &&
        !createsRun(cuisines, i, r.cuisine)
    )
  );
  if (candidates.length === 0) {
    candidates = shuffle(
      recipes.filter((r) => !used.has(r.id) && !excluded.has(r.id) && r.id !== currentId)
    );
  }
  if (candidates.length === 0) return null;

  // Prefer a time bucket underrepresented in the rest of the week, then the
  // cuisine furthest below its target share; keep the final choice random
  // among equally-good picks.
  const bucketCount: Record<Bucket, number> = { quick: 0, medium: 0, long: 0 };
  const cuisineCount = new Map<string, number>();
  for (const id of used) {
    const r = byId.get(id);
    if (!r) continue;
    bucketCount[minuteBucket(r.active_minutes)]++;
    cuisineCount.set(r.cuisine, (cuisineCount.get(r.cuisine) ?? 0) + 1);
  }
  candidates.sort(
    (a, b) =>
      bucketCount[minuteBucket(a.active_minutes)] - bucketCount[minuteBucket(b.active_minutes)]
  );
  const bestBucketUse = bucketCount[minuteBucket(candidates[0].active_minutes)];
  let pool = candidates.filter(
    (c) => bucketCount[minuteBucket(c.active_minutes)] === bestBucketUse
  );
  // Within the best time bucket, narrow to the best-ranked cuisine(s).
  const bestCuisineRank = Math.min(
    ...pool.map((c) => cuisineRank(c.cuisine, cuisineCount, cuisineWeights))
  );
  pool = pool.filter(
    (c) => cuisineRank(c.cuisine, cuisineCount, cuisineWeights) === bestCuisineRank
  );
  return pool[Math.floor(Math.random() * pool.length)].id;
}
