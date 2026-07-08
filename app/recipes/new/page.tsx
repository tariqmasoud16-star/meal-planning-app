import { getVeggieProfile } from "@/lib/queries";
import RecipeForm from "@/components/RecipeForm";

export const dynamic = "force-dynamic";

export default function NewRecipePage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Add recipe</h1>
      <RecipeForm veggies={getVeggieProfile()} />
    </div>
  );
}
