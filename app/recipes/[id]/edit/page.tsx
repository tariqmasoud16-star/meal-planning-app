import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/queries";
import RecipeForm from "@/components/RecipeForm";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = getRecipe(Number(id));
  if (!recipe) notFound();

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Edit: {recipe.title}</h1>
      <RecipeForm recipe={recipe} />
    </div>
  );
}
