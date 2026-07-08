import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  cuisine TEXT NOT NULL,
  protein_grams_estimate INTEGER NOT NULL,
  active_minutes INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('baked','steamed','stovetop','raw','omelette')),
  ingredients TEXT NOT NULL DEFAULT '[]',
  steps TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('seed','manual','ai')),
  photo_path TEXT
);

CREATE TABLE IF NOT EXISTS week_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('lunch','dinner')),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('cook','eat_out','leftovers')),
  recipe_id INTEGER REFERENCES recipes(id),
  eat_out_note TEXT,
  fill_method TEXT NOT NULL DEFAULT 'manual' CHECK (fill_method IN ('proposed','manual','eat_out','leftovers')),
  UNIQUE(date, slot)
);

-- How often each cuisine should show up in the dinner plan, as a 0–100 weight.
-- The weights are relative; the proposal engine treats them as target shares.
CREATE TABLE IF NOT EXISTS cuisine_prefs (
  cuisine TEXT PRIMARY KEY,
  weight INTEGER NOT NULL DEFAULT 0
);

-- Free-form list of vegetables the cook likes or dislikes. Dislikes surface as
-- warnings on the recipe form; likes are shown as gentle encouragement.
CREATE TABLE IF NOT EXISTS veggie_prefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('like','dislike')),
  UNIQUE(name, sentiment)
);
`;

function migrate(db: Database.Database) {
  const recipeCols = (db.pragma("table_info(recipes)") as { name: string }[]).map((c) => c.name);
  if (!recipeCols.includes("photo_path")) {
    db.exec("ALTER TABLE recipes ADD COLUMN photo_path TEXT");
  }
  const planCols = (db.pragma("table_info(week_plan)") as { name: string }[]).map((c) => c.name);
  if (!planCols.includes("fill_method")) {
    db.exec(
      "ALTER TABLE week_plan ADD COLUMN fill_method TEXT NOT NULL DEFAULT 'manual' CHECK (fill_method IN ('proposed','manual','eat_out','leftovers'))"
    );
    // Existing eat-out/leftovers rows describe their own fill method.
    db.exec("UPDATE week_plan SET fill_method = entry_type WHERE entry_type IN ('eat_out','leftovers')");
  }
  // Lunch is no longer plannable.
  db.exec("DELETE FROM week_plan WHERE slot = 'lunch'");
}

function createDb(): Database.Database {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "meals.db"));
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

// Survive Next.js dev-mode hot reloads without leaking connections.
const globalForDb = globalThis as unknown as { __mealsDb?: Database.Database };

export const db: Database.Database = globalForDb.__mealsDb ?? createDb();
globalForDb.__mealsDb = db;
