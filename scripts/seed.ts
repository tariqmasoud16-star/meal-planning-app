// Idempotent seed: inserts each recipe only if a seed recipe with the same
// title doesn't already exist. Safe to re-run any time.

import { db } from "../lib/db";
import { validateIngredients, MAX_ACTIVE_MINUTES } from "../lib/constraints";
import { fetchPhotos } from "./fetch-photos";
import type { Cuisine, Ingredient, IngredientCategory, Method } from "../lib/types";

function ing(
  name: string,
  amount: number,
  unit: string,
  category: IngredientCategory
): Ingredient {
  return { name, amount, unit, category };
}

interface SeedRecipe {
  title: string;
  cuisine: Cuisine;
  protein: number;
  minutes: number;
  method: Method;
  ingredients: Ingredient[];
  steps: string[];
}

const RECIPES: SeedRecipe[] = [
  // ------------------------- MIDDLE EASTERN -------------------------
  {
    title: "Baked Falafel Bowl",
    cuisine: "Middle Eastern",
    protein: 22,
    minutes: 25,
    method: "baked",
    ingredients: [
      ing("canned chickpeas", 480, "g", "pantry"),
      ing("fresh parsley", 1, "bunch", "produce"),
      ing("fresh cilantro", 0.5, "bunch", "produce"),
      ing("ground cumin", 2, "tsp", "pantry"),
      ing("chickpea flour", 3, "tbsp", "pantry"),
      ing("olive oil", 1, "tbsp", "pantry"),
      ing("cucumber", 1, "piece", "produce"),
      ing("tomato", 2, "piece", "produce"),
      ing("plain yogurt", 150, "g", "dairy"),
    ],
    steps: [
      "Heat oven to 220°C. Blitz drained chickpeas with herbs, cumin, chickpea flour and a pinch of salt to a coarse paste.",
      "Shape into 12 small patties, brush with olive oil, place on a lined tray.",
      "Bake 20–22 minutes, flipping once, until golden.",
      "Meanwhile chop cucumber and tomato; season the yogurt with salt and lemon.",
      "Assemble bowls: falafel, salad, yogurt sauce.",
    ],
  },
  {
    title: "Shakshuka-Style Eggs in Tomato (No Onion)",
    cuisine: "Middle Eastern",
    protein: 19,
    minutes: 20,
    method: "stovetop",
    ingredients: [
      ing("canned crushed tomatoes", 400, "g", "pantry"),
      ing("eggs", 3, "piece", "dairy"),
      ing("ground cumin", 1.5, "tsp", "pantry"),
      ing("tomato paste", 1, "tbsp", "pantry"),
      ing("olive oil", 1, "tbsp", "pantry"),
      ing("baby spinach", 80, "g", "produce"),
      ing("feta cheese", 60, "g", "dairy"),
      ing("whole wheat pita", 2, "piece", "pantry"),
    ],
    steps: [
      "Warm olive oil in a skillet; toast cumin 30 seconds, stir in tomato paste.",
      "Add crushed tomatoes, simmer 5 minutes until slightly thickened; season.",
      "Wilt in the spinach, then make 3 wells and crack in the eggs.",
      "Cover and cook 5–6 minutes until whites set.",
      "Crumble feta over; serve with warm pita.",
    ],
  },
  {
    title: "Oven-Roasted Chickpea & Potato Tray Bake",
    cuisine: "Middle Eastern",
    protein: 20,
    minutes: 15,
    method: "baked",
    ingredients: [
      ing("canned chickpeas", 480, "g", "pantry"),
      ing("potato", 600, "g", "produce"),
      ing("ground cumin", 2, "tsp", "pantry"),
      ing("ground coriander", 1, "tsp", "pantry"),
      ing("olive oil", 2, "tbsp", "pantry"),
      ing("lemon", 1, "piece", "produce"),
      ing("plain yogurt", 150, "g", "dairy"),
      ing("baby spinach", 80, "g", "produce"),
    ],
    steps: [
      "Heat oven to 220°C. Dice potatoes small; toss with drained chickpeas, spices and oil on a tray.",
      "Roast 30–35 minutes, turning once (hands-off time).",
      "Season yogurt with lemon and salt.",
      "Serve tray bake over spinach with the lemon-yogurt drizzled on top.",
    ],
  },
  {
    title: "Hummus Power Plate",
    cuisine: "Middle Eastern",
    protein: 18,
    minutes: 15,
    method: "raw",
    ingredients: [
      ing("canned chickpeas", 240, "g", "pantry"),
      ing("tahini", 3, "tbsp", "pantry"),
      ing("lemon", 1, "piece", "produce"),
      ing("cucumber", 1, "piece", "produce"),
      ing("tomato", 2, "piece", "produce"),
      ing("feta cheese", 60, "g", "dairy"),
      ing("whole wheat pita", 2, "piece", "pantry"),
      ing("olive oil", 1, "tbsp", "pantry"),
    ],
    steps: [
      "Blend chickpeas, tahini, lemon juice, a splash of water and salt until smooth.",
      "Chop cucumber and tomato into a quick salad.",
      "Plate hummus, top with salad, feta and olive oil.",
      "Serve with warm pita.",
    ],
  },
  {
    title: "Za'atar White Bean & Tomato Skillet",
    cuisine: "Middle Eastern",
    protein: 21,
    minutes: 20,
    method: "stovetop",
    ingredients: [
      ing("canned white beans", 480, "g", "pantry"),
      ing("canned crushed tomatoes", 400, "g", "pantry"),
      ing("za'atar", 2, "tsp", "pantry"),
      ing("olive oil", 1, "tbsp", "pantry"),
      ing("baby spinach", 100, "g", "produce"),
      ing("feta cheese", 60, "g", "dairy"),
      ing("whole wheat pita", 2, "piece", "pantry"),
    ],
    steps: [
      "Warm oil in a skillet; add tomatoes and simmer 5 minutes.",
      "Stir in drained beans and za'atar; simmer 8 minutes.",
      "Wilt in spinach, season, top with feta.",
      "Serve with pita.",
    ],
  },
  {
    title: "Freekeh & Chickpea Pilaf",
    cuisine: "Middle Eastern",
    protein: 19,
    minutes: 25,
    method: "stovetop",
    ingredients: [
      ing("freekeh", 180, "g", "pantry"),
      ing("canned chickpeas", 240, "g", "pantry"),
      ing("ground cumin", 1.5, "tsp", "pantry"),
      ing("ground cinnamon", 0.5, "tsp", "pantry"),
      ing("olive oil", 1.5, "tbsp", "pantry"),
      ing("tomato", 2, "piece", "produce"),
      ing("plain yogurt", 150, "g", "dairy"),
      ing("slivered almonds", 30, "g", "pantry"),
    ],
    steps: [
      "Toast freekeh in olive oil with cumin and cinnamon for 2 minutes.",
      "Add 450 ml water, simmer covered 15 minutes.",
      "Stir in chickpeas, cook 5 more minutes until tender.",
      "Top with chopped tomato, yogurt and almonds.",
    ],
  },
  {
    title: "Labneh & Chickpea Mezze Bowl",
    cuisine: "Middle Eastern",
    protein: 20,
    minutes: 10,
    method: "raw",
    ingredients: [
      ing("labneh", 200, "g", "dairy"),
      ing("canned chickpeas", 240, "g", "pantry"),
      ing("cucumber", 1, "piece", "produce"),
      ing("tomato", 2, "piece", "produce"),
      ing("olive oil", 1, "tbsp", "pantry"),
      ing("za'atar", 1, "tsp", "pantry"),
      ing("whole wheat pita", 2, "piece", "pantry"),
    ],
    steps: [
      "Spread labneh in bowls.",
      "Top with rinsed chickpeas, chopped cucumber and tomato.",
      "Drizzle with olive oil, sprinkle za'atar.",
      "Serve with pita.",
    ],
  },
  {
    title: "Spinach & Feta Omelette",
    cuisine: "Middle Eastern",
    protein: 21,
    minutes: 10,
    method: "omelette",
    ingredients: [
      ing("eggs", 3, "piece", "dairy"),
      ing("baby spinach", 60, "g", "produce"),
      ing("feta cheese", 50, "g", "dairy"),
      ing("olive oil", 1, "tsp", "pantry"),
      ing("fresh parsley", 0.25, "bunch", "produce"),
      ing("whole wheat pita", 1, "piece", "pantry"),
    ],
    steps: [
      "Whisk eggs with a pinch of salt.",
      "Wilt spinach in a lightly oiled nonstick pan; pour eggs over.",
      "Cook on medium-low until nearly set, scatter feta and parsley, fold.",
      "Serve with pita.",
    ],
  },

  // ----------------------------- ITALIAN -----------------------------
  {
    title: "Pasta e Fagioli (No Onion)",
    cuisine: "Italian",
    protein: 24,
    minutes: 25,
    method: "stovetop",
    ingredients: [
      ing("small pasta (ditalini)", 200, "g", "pantry"),
      ing("canned cannellini beans", 480, "g", "pantry"),
      ing("canned crushed tomatoes", 400, "g", "pantry"),
      ing("celery", 2, "piece", "produce"),
      ing("carrot", 1, "piece", "produce"),
      ing("garlic", 1, "clove", "produce"),
      ing("olive oil", 1.5, "tbsp", "pantry"),
      ing("parmesan cheese", 40, "g", "dairy"),
    ],
    steps: [
      "Soften finely diced celery and carrot in olive oil with a small minced garlic clove, 4 minutes.",
      "Add tomatoes, beans and 500 ml water; simmer 8 minutes.",
      "Add pasta and cook in the soup until al dente.",
      "Season, serve with grated parmesan.",
    ],
  },
  {
    title: "Caprese Protein Bowl",
    cuisine: "Italian",
    protein: 25,
    minutes: 10,
    method: "raw",
    ingredients: [
      ing("fresh mozzarella", 150, "g", "dairy"),
      ing("canned white beans", 240, "g", "pantry"),
      ing("tomato", 3, "piece", "produce"),
      ing("fresh basil", 1, "bunch", "produce"),
      ing("olive oil", 1.5, "tbsp", "pantry"),
      ing("balsamic vinegar", 1, "tbsp", "pantry"),
      ing("whole grain bread", 2, "piece", "pantry"),
    ],
    steps: [
      "Slice tomatoes and mozzarella; rinse the beans.",
      "Layer in a bowl with basil leaves.",
      "Dress with olive oil, balsamic, salt and pepper.",
      "Serve with whole grain bread.",
    ],
  },
  {
    title: "Spinach-Ricotta Whole Wheat Pasta",
    cuisine: "Italian",
    protein: 23,
    minutes: 20,
    method: "stovetop",
    ingredients: [
      ing("whole wheat pasta", 200, "g", "pantry"),
      ing("ricotta cheese", 200, "g", "dairy"),
      ing("baby spinach", 150, "g", "produce"),
      ing("garlic", 1, "clove", "produce"),
      ing("olive oil", 1, "tbsp", "pantry"),
      ing("parmesan cheese", 30, "g", "dairy"),
      ing("lemon", 0.5, "piece", "produce"),
    ],
    steps: [
      "Cook pasta; reserve a cup of pasta water.",
      "Gently warm olive oil with a small garlic clove; wilt in spinach.",
      "Off heat, stir in ricotta, lemon zest and enough pasta water for a creamy sauce.",
      "Toss with pasta, finish with parmesan.",
    ],
  },
  {
    title: "White Bean & Spinach Soup",
    cuisine: "Italian",
    protein: 19,
    minutes: 20,
    method: "stovetop",
    ingredients: [
      ing("canned cannellini beans", 480, "g", "pantry"),
      ing("vegetable broth", 750, "ml", "pantry"),
      ing("baby spinach", 150, "g", "produce"),
      ing("carrot", 1, "piece", "produce"),
      ing("celery", 1, "piece", "produce"),
      ing("garlic", 1, "clove", "produce"),
      ing("olive oil", 1, "tbsp", "pantry"),
      ing("parmesan cheese", 30, "g", "dairy"),
    ],
    steps: [
      "Soften diced carrot and celery in olive oil with a small garlic clove.",
      "Add broth and beans; simmer 10 minutes.",
      "Mash a few beans against the pot to thicken; stir in spinach.",
      "Serve with parmesan on top.",
    ],
  },
  {
    title: "Baked Gnocchi with Tomato & Mozzarella",
    cuisine: "Italian",
    protein: 22,
    minutes: 15,
    method: "baked",
    ingredients: [
      ing("potato gnocchi", 400, "g", "pantry"),
      ing("canned crushed tomatoes", 400, "g", "pantry"),
      ing("fresh mozzarella", 125, "g", "dairy"),
      ing("canned white beans", 240, "g", "pantry"),
      ing("fresh basil", 0.5, "bunch", "produce"),
      ing("olive oil", 1, "tbsp", "pantry"),
    ],
    steps: [
      "Heat oven to 220°C. Stir gnocchi, beans and tomatoes with oil and salt in a baking dish.",
      "Bake 15 minutes; stir once.",
      "Top with torn mozzarella, bake 8 more minutes until bubbling.",
      "Finish with basil.",
    ],
  },
  {
    title: "Broccoli & Cannellini Orecchiette",
    cuisine: "Italian",
    protein: 21,
    minutes: 25,
    method: "stovetop",
    ingredients: [
      ing("orecchiette pasta", 200, "g", "pantry"),
      ing("broccoli", 400, "g", "produce"),
      ing("canned cannellini beans", 240, "g", "pantry"),
      ing("garlic", 1, "clove", "produce"),
      ing("chili flakes", 0.5, "tsp", "pantry"),
      ing("olive oil", 1.5, "tbsp", "pantry"),
      ing("parmesan cheese", 40, "g", "dairy"),
    ],
    steps: [
      "Cook pasta; add broccoli florets for the last 4 minutes.",
      "Warm olive oil with a small garlic clove and chili flakes.",
      "Add drained beans, then pasta and broccoli with a splash of pasta water.",
      "Toss until glossy; serve with parmesan.",
    ],
  },
  {
    title: "Tomato-Basil Chickpea Pasta",
    cuisine: "Italian",
    protein: 28,
    minutes: 15,
    method: "stovetop",
    ingredients: [
      ing("chickpea pasta", 200, "g", "pantry"),
      ing("canned crushed tomatoes", 400, "g", "pantry"),
      ing("garlic", 1, "clove", "produce"),
      ing("fresh basil", 0.5, "bunch", "produce"),
      ing("olive oil", 1, "tbsp", "pantry"),
      ing("parmesan cheese", 30, "g", "dairy"),
    ],
    steps: [
      "Cook chickpea pasta per package.",
      "Simmer tomatoes with olive oil and a small garlic clove for 8 minutes.",
      "Toss pasta with sauce and basil.",
      "Serve with parmesan.",
    ],
  },
  {
    title: "Broccoli-Parmesan Baked Potato",
    cuisine: "Italian",
    protein: 20,
    minutes: 15,
    method: "baked",
    ingredients: [
      ing("potato", 2, "piece", "produce"),
      ing("broccoli", 300, "g", "produce"),
      ing("cottage cheese", 200, "g", "dairy"),
      ing("parmesan cheese", 40, "g", "dairy"),
      ing("olive oil", 1, "tsp", "pantry"),
      ing("chives", 0.25, "bunch", "produce"),
    ],
    steps: [
      "Microwave potatoes 8–10 minutes until tender (or bake ahead); steam broccoli 4 minutes.",
      "Split potatoes; fluff the insides with a little olive oil and salt.",
      "Load with cottage cheese and broccoli.",
      "Top with parmesan and chives; grill 3 minutes to melt.",
    ],
  },

  // ------------------------------ INDIAN ------------------------------
  {
    title: "Chickpea-Spinach Curry (Chana Palak)",
    cuisine: "Indian",
    protein: 22,
    minutes: 25,
    method: "stovetop",
    ingredients: [
      ing("canned chickpeas", 480, "g", "pantry"),
      ing("baby spinach", 200, "g", "produce"),
      ing("canned crushed tomatoes", 400, "g", "pantry"),
      ing("fresh ginger", 20, "g", "produce"),
      ing("ground cumin", 1.5, "tsp", "pantry"),
      ing("ground coriander", 1.5, "tsp", "pantry"),
      ing("ground turmeric", 0.5, "tsp", "pantry"),
      ing("olive oil", 1.5, "tbsp", "pantry"),
      ing("basmati rice", 180, "g", "pantry"),
    ],
    steps: [
      "Start rice. Warm oil; bloom grated ginger and spices 1 minute.",
      "Add tomatoes; simmer 5 minutes.",
      "Add chickpeas; simmer 10 minutes until thick.",
      "Stir in spinach to wilt; season and serve over rice.",
    ],
  },
  {
    title: "Palak Paneer (Light Garlic)",
    cuisine: "Indian",
    protein: 26,
    minutes: 30,
    method: "stovetop",
    ingredients: [
      ing("paneer", 225, "g", "dairy"),
      ing("baby spinach", 300, "g", "produce"),
      ing("tomato", 2, "piece", "produce"),
      ing("fresh ginger", 20, "g", "produce"),
      ing("garlic", 1, "clove", "produce"),
      ing("ground cumin", 1, "tsp", "pantry"),
      ing("garam masala", 1, "tsp", "pantry"),
      ing("plain yogurt", 100, "g", "dairy"),
      ing("basmati rice", 180, "g", "pantry"),
    ],
    steps: [
      "Start rice. Blanch spinach 1 minute, then blend to a purée.",
      "Sauté cubed paneer in a lightly oiled pan until golden; set aside.",
      "Bloom ginger, one small garlic clove and spices; add chopped tomato, cook 4 minutes.",
      "Add spinach purée, simmer 5 minutes; stir in paneer and yogurt.",
      "Serve over rice.",
    ],
  },
  {
    title: "Chana Masala (No Onion)",
    cuisine: "Indian",
    protein: 21,
    minutes: 25,
    method: "stovetop",
    ingredients: [
      ing("canned chickpeas", 480, "g", "pantry"),
      ing("canned crushed tomatoes", 400, "g", "pantry"),
      ing("fresh ginger", 20, "g", "produce"),
      ing("ground cumin", 1.5, "tsp", "pantry"),
      ing("ground coriander", 1.5, "tsp", "pantry"),
      ing("garam masala", 1, "tsp", "pantry"),
      ing("olive oil", 1.5, "tbsp", "pantry"),
      ing("fresh cilantro", 0.5, "bunch", "produce"),
      ing("basmati rice", 180, "g", "pantry"),
    ],
    steps: [
      "Start rice. Bloom grated ginger and spices in oil for 1 minute.",
      "Add tomatoes, simmer 5 minutes.",
      "Add chickpeas with a splash of water; simmer 12 minutes, mashing a few.",
      "Finish with garam masala and cilantro; serve over rice.",
    ],
  },
  {
    title: "Matar Paneer (No Onion)",
    cuisine: "Indian",
    protein: 24,
    minutes: 25,
    method: "stovetop",
    ingredients: [
      ing("paneer", 200, "g", "dairy"),
      ing("frozen green peas", 250, "g", "produce"),
      ing("canned crushed tomatoes", 400, "g", "pantry"),
      ing("fresh ginger", 20, "g", "produce"),
      ing("ground cumin", 1, "tsp", "pantry"),
      ing("garam masala", 1, "tsp", "pantry"),
      ing("plain yogurt", 100, "g", "dairy"),
      ing("basmati rice", 180, "g", "pantry"),
    ],
    steps: [
      "Start rice. Bloom ginger and cumin in a lightly oiled pot.",
      "Add tomatoes; simmer 5 minutes.",
      "Add peas and cubed paneer; simmer 8 minutes.",
      "Stir in yogurt and garam masala off heat; serve over rice.",
    ],
  },
  {
    title: "Rajma (Kidney Bean Curry)",
    cuisine: "Indian",
    protein: 20,
    minutes: 25,
    method: "stovetop",
    ingredients: [
      ing("canned kidney beans", 480, "g", "pantry"),
      ing("canned crushed tomatoes", 400, "g", "pantry"),
      ing("fresh ginger", 25, "g", "produce"),
      ing("ground cumin", 1.5, "tsp", "pantry"),
      ing("ground coriander", 1.5, "tsp", "pantry"),
      ing("garam masala", 1, "tsp", "pantry"),
      ing("olive oil", 1.5, "tbsp", "pantry"),
      ing("basmati rice", 180, "g", "pantry"),
    ],
    steps: [
      "Start rice. Bloom grated ginger and spices in oil.",
      "Add tomatoes; cook down 5 minutes.",
      "Add beans and a splash of water; simmer 15 minutes, mashing some for creaminess.",
      "Finish with garam masala; serve over rice.",
    ],
  },
  {
    title: "Tandoori-Spiced Paneer & Broccoli Tray",
    cuisine: "Indian",
    protein: 28,
    minutes: 15,
    method: "baked",
    ingredients: [
      ing("paneer", 225, "g", "dairy"),
      ing("broccoli", 400, "g", "produce"),
      ing("plain yogurt", 150, "g", "dairy"),
      ing("ground cumin", 1, "tsp", "pantry"),
      ing("ground coriander", 1, "tsp", "pantry"),
      ing("ground turmeric", 0.5, "tsp", "pantry"),
      ing("garam masala", 1, "tsp", "pantry"),
      ing("lemon", 1, "piece", "produce"),
      ing("basmati rice", 180, "g", "pantry"),
    ],
    steps: [
      "Heat oven to 230°C. Mix yogurt with spices and lemon juice.",
      "Toss cubed paneer and broccoli in the marinade; spread on a lined tray.",
      "Roast 20 minutes until charred at the edges (hands-off).",
      "Serve over rice with extra lemon.",
    ],
  },

  // ------------------------------- ASIAN -------------------------------
  {
    title: "Tofu-Broccoli Stir-Fry",
    cuisine: "Asian",
    protein: 24,
    minutes: 20,
    method: "stovetop",
    ingredients: [
      ing("firm tofu", 350, "g", "pantry"),
      ing("broccoli", 400, "g", "produce"),
      ing("soy sauce", 3, "tbsp", "pantry"),
      ing("fresh ginger", 20, "g", "produce"),
      ing("sesame oil", 2, "tsp", "pantry"),
      ing("cornstarch", 1, "tbsp", "pantry"),
      ing("brown rice", 180, "g", "pantry"),
      ing("sesame seeds", 1, "tbsp", "pantry"),
    ],
    steps: [
      "Start rice. Press tofu, cube, toss with cornstarch.",
      "Sear tofu in a lightly oiled nonstick pan until golden; set aside.",
      "Stir-fry broccoli with ginger 4 minutes with a splash of water, covered.",
      "Return tofu; add soy sauce and sesame oil, toss to glaze.",
      "Serve over rice with sesame seeds.",
    ],
  },
  {
    title: "Steamed Ginger Tofu with Greens",
    cuisine: "Asian",
    protein: 22,
    minutes: 15,
    method: "steamed",
    ingredients: [
      ing("silken-firm tofu", 400, "g", "pantry"),
      ing("bok choy", 300, "g", "produce"),
      ing("fresh ginger", 25, "g", "produce"),
      ing("soy sauce", 2.5, "tbsp", "pantry"),
      ing("sesame oil", 1.5, "tsp", "pantry"),
      ing("brown rice", 180, "g", "pantry"),
      ing("cilantro", 0.25, "bunch", "produce"),
    ],
    steps: [
      "Start rice. Steam tofu slabs and bok choy 8 minutes.",
      "Warm soy sauce with julienned ginger and sesame oil.",
      "Pour sauce over tofu and greens.",
      "Serve with rice and cilantro.",
    ],
  },
  {
    title: "Edamame & Egg Rice Bowl",
    cuisine: "Asian",
    protein: 23,
    minutes: 20,
    method: "stovetop",
    ingredients: [
      ing("frozen shelled edamame", 250, "g", "produce"),
      ing("eggs", 2, "piece", "dairy"),
      ing("brown rice", 180, "g", "pantry"),
      ing("soy sauce", 2, "tbsp", "pantry"),
      ing("fresh ginger", 15, "g", "produce"),
      ing("carrot", 1, "piece", "produce"),
      ing("sesame oil", 1, "tsp", "pantry"),
      ing("nori sheets", 1, "piece", "pantry"),
    ],
    steps: [
      "Cook rice; boil edamame 4 minutes.",
      "Soft-scramble eggs in a lightly oiled pan.",
      "Bowl the rice; top with edamame, eggs and grated carrot.",
      "Dress with soy, ginger and sesame oil; snip nori over.",
    ],
  },
  {
    title: "Peanut-Sesame Soba with Edamame",
    cuisine: "Asian",
    protein: 24,
    minutes: 15,
    method: "stovetop",
    ingredients: [
      ing("soba noodles", 180, "g", "pantry"),
      ing("frozen shelled edamame", 200, "g", "produce"),
      ing("peanut butter", 3, "tbsp", "pantry"),
      ing("soy sauce", 2, "tbsp", "pantry"),
      ing("rice vinegar", 1, "tbsp", "pantry"),
      ing("cucumber", 1, "piece", "produce"),
      ing("sesame seeds", 1, "tbsp", "pantry"),
    ],
    steps: [
      "Boil soba with edamame for the last 4 minutes; rinse in cold water.",
      "Whisk peanut butter, soy, vinegar and a splash of warm water into a sauce.",
      "Toss noodles and edamame in the sauce.",
      "Top with cucumber ribbons and sesame seeds.",
    ],
  },
  {
    title: "Miso Soup Bowl with Tofu & Spinach",
    cuisine: "Asian",
    protein: 18,
    minutes: 15,
    method: "stovetop",
    ingredients: [
      ing("firm tofu", 300, "g", "pantry"),
      ing("miso paste", 3, "tbsp", "pantry"),
      ing("baby spinach", 100, "g", "produce"),
      ing("brown rice", 150, "g", "pantry"),
      ing("nori sheets", 1, "piece", "pantry"),
      ing("fresh ginger", 10, "g", "produce"),
      ing("sesame oil", 1, "tsp", "pantry"),
    ],
    steps: [
      "Start rice. Simmer 750 ml water with ginger; add cubed tofu 5 minutes.",
      "Off the boil, whisk in miso paste.",
      "Add spinach to wilt.",
      "Serve over rice with nori and a drop of sesame oil.",
    ],
  },
  {
    title: "Thai Basil Tofu (No Onion)",
    cuisine: "Asian",
    protein: 22,
    minutes: 20,
    method: "stovetop",
    ingredients: [
      ing("firm tofu", 350, "g", "pantry"),
      ing("green beans", 250, "g", "produce"),
      ing("fresh basil", 1, "bunch", "produce"),
      ing("soy sauce", 2.5, "tbsp", "pantry"),
      ing("garlic", 1, "clove", "produce"),
      ing("fresh ginger", 15, "g", "produce"),
      ing("jasmine rice", 180, "g", "pantry"),
    ],
    steps: [
      "Start rice. Crumble tofu and sear in a lightly oiled pan until browned.",
      "Add chopped green beans, one small garlic clove and ginger; stir-fry 4 minutes.",
      "Season with soy sauce and a splash of water.",
      "Fold in basil off heat; serve over rice.",
    ],
  },
  {
    title: "Teriyaki-Baked Tofu & Broccoli Bowl",
    cuisine: "Asian",
    protein: 25,
    minutes: 15,
    method: "baked",
    ingredients: [
      ing("firm tofu", 350, "g", "pantry"),
      ing("broccoli", 350, "g", "produce"),
      ing("soy sauce", 3, "tbsp", "pantry"),
      ing("maple syrup", 1, "tbsp", "pantry"),
      ing("rice vinegar", 1, "tbsp", "pantry"),
      ing("fresh ginger", 15, "g", "produce"),
      ing("brown rice", 180, "g", "pantry"),
      ing("sesame seeds", 1, "tbsp", "pantry"),
    ],
    steps: [
      "Heat oven to 220°C; start rice. Cube tofu, toss with half the soy.",
      "Bake tofu and broccoli on a tray 20 minutes (hands-off).",
      "Simmer remaining soy, maple, vinegar and ginger into a glaze.",
      "Toss everything in the glaze; serve over rice with sesame seeds.",
    ],
  },
];

// --- Safety net: refuse to seed anything violating the profile ------------
for (const r of RECIPES) {
  const warnings = validateIngredients(
    r.ingredients.map((i) => i.name),
    `${r.title} ${r.steps.join(" ")}`
  ).filter((w) => w.level !== "note"); // 'note' (light garlic) is allowed
  if (warnings.length > 0) {
    throw new Error(
      `Seed recipe "${r.title}" violates constraints: ${warnings
        .map((w) => `${w.label} in "${w.found_in}"`)
        .join("; ")}`
    );
  }
  if (r.minutes > MAX_ACTIVE_MINUTES) {
    throw new Error(`Seed recipe "${r.title}" exceeds ${MAX_ACTIVE_MINUTES} active minutes`);
  }
}

// --- Idempotent insert ------------------------------------------------------
const exists = db.prepare("SELECT 1 FROM recipes WHERE title = ? AND source = 'seed'");
const insert = db.prepare(
  `INSERT INTO recipes (title, cuisine, protein_grams_estimate, active_minutes, method, ingredients, steps, source)
   VALUES (?, ?, ?, ?, ?, ?, ?, 'seed')`
);

let inserted = 0;
let skipped = 0;
const seedAll = db.transaction(() => {
  for (const r of RECIPES) {
    if (exists.get(r.title)) {
      skipped++;
      continue;
    }
    insert.run(
      r.title,
      r.cuisine,
      r.protein,
      r.minutes,
      r.method,
      JSON.stringify(r.ingredients),
      JSON.stringify(r.steps)
    );
    inserted++;
  }
});
seedAll();

const total = (db.prepare("SELECT COUNT(*) AS n FROM recipes").get() as { n: number }).n;
console.log(`Seed complete: ${inserted} inserted, ${skipped} already present, ${total} recipes total.`);

fetchPhotos().catch((err) => {
  console.error(err);
  process.exit(1);
});
