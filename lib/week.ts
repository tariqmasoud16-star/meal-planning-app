// Date helpers for Monday-to-Sunday weeks, in local time.
// One definition of a week's boundaries, used everywhere (view, actions,
// shopping list). The two visible weeks are always mondayOf(today) and the
// Monday seven days later.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday (local, midnight) of the week containing `today`. */
export function mondayOf(today: Date = new Date()): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dow = d.getDay(); // 0 = Sunday
  const daysSinceMonday = (dow + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

/** Seven ISO dates Mon–Sun starting at the given Monday. */
function weekFrom(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return toISODate(day);
  });
}

export function currentWeekDates(today: Date = new Date()): string[] {
  return weekFrom(mondayOf(today));
}

export function nextWeekDates(today: Date = new Date()): string[] {
  const m = mondayOf(today);
  m.setDate(m.getDate() + 7);
  return weekFrom(m);
}

export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
