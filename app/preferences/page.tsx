import { getCuisinePrefs, getVeggiePrefs } from "@/lib/queries";
import CuisineMix from "@/components/CuisineMix";
import VeggiePrefs from "@/components/VeggiePrefs";

export const dynamic = "force-dynamic";

export default function PreferencesPage() {
  const cuisinePrefs = getCuisinePrefs();
  const veggiePrefs = getVeggiePrefs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Preferences</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Tell the planner what you like to cook and eat.
        </p>
      </div>
      <CuisineMix prefs={cuisinePrefs} />
      <VeggiePrefs prefs={veggiePrefs} />
    </div>
  );
}
