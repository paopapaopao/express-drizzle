import { asc, eq } from 'drizzle-orm';
import { Router } from 'express';

import { db } from '../db/index.ts';
import { recipesTable } from '../db/schema.ts';

const router = Router();

router.get('/', async (_req, res) => {
  const recipes = await db.select().from(recipesTable).orderBy(asc(recipesTable.id));
  res.json(recipes);
});

// Largest value a Postgres `integer` column can hold
const MAX_INT = 2_147_483_647;

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!/^\d+$/.test(req.params.id) || id < 1 || id > MAX_INT) {
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

export default router;
