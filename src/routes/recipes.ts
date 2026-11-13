import { asc, eq } from 'drizzle-orm';
import { createInsertSchema, createUpdateSchema } from 'drizzle-orm/zod';
import { Router } from 'express';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { recipesTable } from '../db/schema.ts';

const router = Router();

// Request body validation, generated from the table definition.
// The extra rules match the database's check constraints and add basic sanity checks.
const refinements = {
  name: (s: z.ZodString) => s.trim().min(1),
  image: (s: z.ZodString) => s.trim().min(1),
  ingredients: (s: z.ZodArray<z.ZodString>) => s.min(1),
  instructions: (s: z.ZodArray<z.ZodString>) => s.min(1),
  prepTime: (s: z.ZodInt) => s.min(0),
  cookTime: (s: z.ZodInt) => s.min(0),
  servings: (s: z.ZodInt) => s.min(1),
  calories: (s: z.ZodInt) => s.min(0),
};

// Timestamps are managed by the database, so clients can't set them
const omitTimestamps = { createdAt: true, updatedAt: true } as const;

const createRecipeSchema = createInsertSchema(recipesTable, refinements).omit(omitTimestamps);
const updateRecipeSchema = createUpdateSchema(recipesTable, refinements).omit(omitTimestamps);

// Largest value a Postgres `integer` column can hold
const MAX_INT = 2_147_483_647;

// Returns the id as a number, or null if it isn't a valid recipe id
const parseId = (raw: string): number | null => {
  const id = Number(raw);
  return /^\d+$/.test(raw) && id >= 1 && id <= MAX_INT ? id : null;
};

router.get('/', async (_req, res) => {
  const recipes = await db.select().from(recipesTable).orderBy(asc(recipesTable.id));
  res.json(recipes);
});

router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'Invalid recipe id' });
    return;
  }

  const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, id));
  if (!recipe) {
    res.status(404).json({ message: `Recipe ${id} not found` });
    return;
  }

  res.json(recipe);
});

router.post('/', async (req, res) => {
  const result = createRecipeSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ message: 'Invalid recipe', errors: z.flattenError(result.error).fieldErrors });
    return;
  }

  const [recipe] = await db.insert(recipesTable).values(result.data).returning();
  res.status(201).json(recipe);
});

router.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'Invalid recipe id' });
    return;
  }

  const result = updateRecipeSchema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ message: 'Invalid recipe', errors: z.flattenError(result.error).fieldErrors });
    return;
  }
  if (Object.keys(result.data).length === 0) {
    res.status(400).json({ message: 'No fields to update' });
    return;
  }

  const [recipe] = await db
    .update(recipesTable)
    .set(result.data)
    .where(eq(recipesTable.id, id))
    .returning();
  if (!recipe) {
    res.status(404).json({ message: `Recipe ${id} not found` });
    return;
  }

  res.json(recipe);
});

router.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'Invalid recipe id' });
    return;
  }

  const [deleted] = await db
    .delete(recipesTable)
    .where(eq(recipesTable.id, id))
    .returning({ id: recipesTable.id });
  if (!deleted) {
    res.status(404).json({ message: `Recipe ${id} not found` });
    return;
  }

  res.status(204).end();
});

export default router;
