import { getRecipes, getWeekPlan } from "@/lib/queries";
import { currentWeekDates, toISODate } from "@/lib/week";
import { lunchSuggestion } from "@/lib/lunch";
import WeekGrid from "@/components/WeekGrid";

export const dynamic = "force-dynamic";

export default function WeekPage() {
  const dates = currentWeekDates();
  const plan = getWeekPlan(dates);
  const recipes = getRecipes();
  const today = toISODate(new Date());
  const lunches = dates.map((d) => lunchSuggestion(d));

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">This week</h1>
      <WeekGrid dates={dates} plan={plan} recipes={recipes} today={today} lunches={lunches} />
    </div>
  );
}
