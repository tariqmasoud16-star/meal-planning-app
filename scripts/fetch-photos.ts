// Seed-time photo fetch from Pexels. This is the ONLY place the Pexels API
// is touched — never at app runtime. Idempotent: recipes whose photo file
// already exists on disk are skipped (no re-download).

import fs from "fs";
import path from "path";
import { db } from "../lib/db";

// Overridable for testing; defaults to the real Pexels endpoint.
const API_URL = process.env.PEXELS_API_URL ?? "https://api.pexels.com/v1/search";

interface RecipeRow {
  id: number;
  title: string;
  ingredients: string;
  photo_path: string | null;
}

export async function fetchPhotos(): Promise<void> {
  try {
    process.loadEnvFile(); // picks up .env if present
  } catch {
    /* no .env file — fine */
  }
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.log(
      "PEXELS_API_KEY not set — skipping photo fetch. The app works photo-less (placeholders render)."
    );
    return;
  }

  const dir = path.join(process.cwd(), "public", "recipe-photos");
  fs.mkdirSync(dir, { recursive: true });

  const recipes = db
    .prepare("SELECT id, title, ingredients, photo_path FROM recipes")
    .all() as RecipeRow[];

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipe of recipes) {
    const file = path.join(dir, `${recipe.id}.jpg`);
    const relPath = `/recipe-photos/${recipe.id}.jpg`;

    if (fs.existsSync(file)) {
      // File already on disk — never re-download. Adopt it if the DB lost the path.
      if (!recipe.photo_path) {
        db.prepare("UPDATE recipes SET photo_path = ? WHERE id = ?").run(relPath, recipe.id);
      }
      skipped++;
      continue;
    }

    const mainIngredient = (JSON.parse(recipe.ingredients)[0]?.name as string) ?? "";
    const cleanTitle = recipe.title.replace(/\(.*?\)/g, "").trim();
    const query = `${cleanTitle} ${mainIngredient}`.trim();

    try {
      const searchRes = await fetch(
        `${API_URL}?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1`,
        { headers: { Authorization: apiKey } }
      );
      if (!searchRes.ok) {
        console.warn(`  ✗ Pexels HTTP ${searchRes.status} for "${recipe.title}" — skipping`);
        failed++;
        continue;
      }
      const data = (await searchRes.json()) as {
        photos?: { src?: { large?: string; medium?: string } }[];
      };
      const photoUrl = data.photos?.[0]?.src?.large ?? data.photos?.[0]?.src?.medium;
      if (!photoUrl) {
        console.warn(`  ✗ No Pexels result for "${recipe.title}" (query: ${query})`);
        failed++;
        continue;
      }
      const imgRes = await fetch(photoUrl);
      if (!imgRes.ok) {
        console.warn(`  ✗ Image download failed (HTTP ${imgRes.status}) for "${recipe.title}"`);
        failed++;
        continue;
      }
      fs.writeFileSync(file, Buffer.from(await imgRes.arrayBuffer()));
      db.prepare("UPDATE recipes SET photo_path = ? WHERE id = ?").run(relPath, recipe.id);
      console.log(`  ✓ ${recipe.title}`);
      downloaded++;
    } catch (err) {
      console.warn(`  ✗ Error for "${recipe.title}": ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(
    `Photos: ${downloaded} downloaded, ${skipped} already present, ${failed} failed.`
  );
}
