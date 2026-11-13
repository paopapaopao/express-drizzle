import { db } from './index.ts';
import { difficultyEnum, mealTypeEnum, recipesTable } from './schema.ts';

type DummyRecipe = {
  name: string;
  image: string;
  ingredients: string[];
  instructions: string[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: string;
  servings: number;
  caloriesPerServing: number;
  cuisine: string;
  mealType: string[];
  tags: string[];
};

type NewRecipe = typeof recipesTable.$inferInsert;
type Difficulty = (typeof difficultyEnum.enumValues)[number];
type MealType = (typeof mealTypeEnum.enumValues)[number];

// dummyjson uses both "Snack" and "Snacks"
const mealTypeAliases: Record<string, MealType> = { snacks: 'snack' };

const toDifficulty = (value: string): Difficulty => {
  const v = value.toLowerCase();
  if (!(difficultyEnum.enumValues as readonly string[]).includes(v)) {
    throw new Error(`Unknown difficulty: ${value}`);
  }
  return v as Difficulty;
};

const toMealType = (value: string): MealType => {
  const v = value.toLowerCase();
  const mapped = mealTypeAliases[v] ?? v;
  if (!(mealTypeEnum.enumValues as readonly string[]).includes(mapped)) {
    throw new Error(`Unknown meal type: ${value}`);
  }
  return mapped as MealType;
};

const toRecipe = (r: DummyRecipe): NewRecipe => ({
  name: r.name,
  image: r.image,
  ingredients: r.ingredients,
  instructions: r.instructions,
  prepTime: r.prepTimeMinutes,
  cookTime: r.cookTimeMinutes,
  difficulty: toDifficulty(r.difficulty),
  servings: r.servings,
  calories: r.caloriesPerServing,
  cuisine: r.cuisine,
  // Remove duplicates created by merging "Snack" and "Snacks"
  mealTypes: [...new Set(r.mealType.map(toMealType))],
  tags: r.tags,
});

const seed = async () => {
  const res = await fetch('https://dummyjson.com/recipes?limit=0');
  if (!res.ok) {
    throw new Error(`Failed to fetch recipes: ${res.status} ${res.statusText}`);
  }
  const { recipes } = (await res.json()) as { recipes: DummyRecipe[] };
  const rows = recipes.map(toRecipe);

  // Replace all existing recipes so the seed can be re-run safely
  await db.transaction(async (tx) => {
    await tx.delete(recipesTable);
    await tx.insert(recipesTable).values(rows);
  });

  console.log(`Seeded ${rows.length} recipes`);
};

try {
  await seed();
} finally {
  await db.$client.end();
}
