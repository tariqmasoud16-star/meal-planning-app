import { getRecipes, getWeekPlan } from "@/lib/queries";
import { currentWeekDates, nextWeekDates, toISODate } from "@/lib/week";
import { lunchSuggestion } from "@/lib/lunch";
import WeekGrid from "@/components/WeekGrid";

export const dynamic = "force-dynamic";

export default function WeekPage() {
  const current = currentWeekDates();
  const next = nextWeekDates();
  const plan = getWeekPlan([...current, ...next]);
  const recipes = getRecipes();
  const today = toISODate(new Date());

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">This week</h1>
        <WeekGrid
          week="current"
          dates={current}
          plan={plan}
          recipes={recipes}
          today={today}
          lunches={current.map((d) => lunchSuggestion(d))}
        />
      </section>
      <section>
        <h1 className="mb-4 text-xl font-bold">Next week</h1>
        <WeekGrid
          week="next"
          dates={next}
          plan={plan}
          recipes={recipes}
          today={today}
          lunches={next.map((d) => lunchSuggestion(d))}
        />
      </section>
    </div>
  );
}
