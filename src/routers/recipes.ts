import { and, asc, eq, gt } from 'drizzle-orm';
import { createInsertSchema, createUpdateSchema } from 'drizzle-orm/zod';
import { type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { recipesTable } from '../db/schema.ts';
import { DEFAULT_PAGE_SIZE, listQuerySchema, MAX_INT, searchFilter } from './recipe-search.ts';

const router = Router();

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

const omitTimestamps = { createdAt: true, updatedAt: true } as const;

const createRecipeSchema = createInsertSchema(recipesTable, refinements).omit(omitTimestamps);
const updateRecipeSchema = createUpdateSchema(recipesTable, refinements).omit(omitTimestamps);

// Returns the id as a number, or null if it isn't a valid recipe id
const parseId = (raw: string): number | null => {
  const id = Number(raw);

  return /^\d+$/.test(raw) && id >= 1 && id <= MAX_INT ? id : null;
};

router.get('/', async (req, res) => {
  // With no query at all, keep returning every recipe as a plain array for older clients
  if (Object.keys(req.query).length === 0) {
    const recipes = await db.select().from(recipesTable).orderBy(asc(recipesTable.id));
    res.json(recipes);

    return;
  }

  const result = listQuerySchema.safeParse(req.query);

  if (!result.success) {
    const { formErrors, fieldErrors } = z.flattenError(result.error);
    res.status(400).json({
      // Unknown parameters end up in formErrors, e.g. "Unrecognized key: \"ingredient\""
      message: formErrors[0] ?? 'Invalid query',
      errors: fieldErrors,
    });

    return;
  }

  const { limit, cursor } = result.data;
  const pageSize = limit ?? DEFAULT_PAGE_SIZE;
  // Fetch one extra row to know whether another page exists
  const rows = await db
    .select()
    .from(recipesTable)
    .where(
      and(
        cursor === undefined ? undefined : gt(recipesTable.id, cursor),
        searchFilter(result.data),
      ),
    )
    .orderBy(asc(recipesTable.id))
    .limit(pageSize + 1);

  const items = rows.slice(0, pageSize);
  const nextCursor = rows.length > pageSize ? items[items.length - 1].id : null;

  res.json({ items, nextCursor });
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
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

router.patch('/:id', async (req: Request<{ id: string }>, res: Response) => {
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

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const id = parseId(req.params.id);

  if (id === null) {
    res.status(400).json({ message: 'Invalid recipe id' });

    return;
  }

  const [recipe] = await db
    .delete(recipesTable)
    .where(eq(recipesTable.id, id))
    .returning({ id: recipesTable.id });

  if (!recipe) {
    res.status(404).json({ message: `Recipe ${id} not found` });

    return;
  }

  res.status(204).end();
});

export default router;
