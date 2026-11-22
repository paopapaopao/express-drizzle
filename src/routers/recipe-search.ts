import { and, arrayOverlaps, gte, ilike, inArray, lte, or, type SQL, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { z } from 'zod';

import { difficultyEnum, mealTypeEnum, recipesTable } from '../db/schema.ts';

// Largest value a Postgres `integer` column can hold
export const MAX_INT = 2_147_483_647;
export const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_TEXT_LENGTH = 100;
const MAX_LIST_ITEMS = 20;

const text = z.string().trim().min(1).max(MAX_TEXT_LENGTH);

// A comma-separated query value, e.g. `tomato, basil` → ['tomato', 'basil']
const commaList = <T extends z.ZodType<unknown, string>>(item: T) =>
  z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .pipe(z.array(item).min(1).max(MAX_LIST_ITEMS));

const count = z.coerce.number().int().min(0).max(MAX_INT);

// Numeric fields that can be filtered by range with `<field>Min` and `<field>Max`
const RANGE_FIELDS = ['prepTime', 'cookTime', 'servings', 'calories'] as const;

export const listQuerySchema = z
  .strictObject({
    // Paging
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
    // Id of the last recipe already received; the page starts after it
    cursor: count.optional(),

    // Quick search: name or cuisine contains this text
    q: z.string().trim().max(MAX_TEXT_LENGTH).optional(),

    // Contains this text
    name: text.optional(),
    cuisine: text.optional(),

    // Every term must appear in at least one item of the list
    ingredients: commaList(text).optional(),
    instructions: commaList(text).optional(),
    tags: commaList(text).optional(),

    // Any of these values
    difficulty: commaList(z.enum(difficultyEnum.enumValues)).optional(),
    mealTypes: commaList(z.enum(mealTypeEnum.enumValues)).optional(),

    // Inclusive ranges
    prepTimeMin: count.optional(),
    prepTimeMax: count.optional(),
    cookTimeMin: count.optional(),
    cookTimeMax: count.optional(),
    servingsMin: count.optional(),
    servingsMax: count.optional(),
    caloriesMin: count.optional(),
    caloriesMax: count.optional(),
  })
  .superRefine((query, ctx) => {
    for (const field of RANGE_FIELDS) {
      const min = query[`${field}Min`];
      const max = query[`${field}Max`];

      if (min !== undefined && max !== undefined && min > max) {
        ctx.addIssue({
          code: 'custom',
          path: [`${field}Max`],
          message: `Must be at least ${field}Min (${min})`,
        });
      }
    }
  });

export type ListQuery = z.infer<typeof listQuerySchema>;

// Escapes LIKE wildcards so `%` and `_` in a search match literally
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

const contains = (value: string) => `%${escapeLike(value)}%`;

// True when some item of a text[] column contains `term` (case-insensitive)
const arrayItemContains = (column: PgColumn, term: string) =>
  sql`exists (select 1 from unnest(${column}) as item where item ilike ${contains(term)})`;

// Builds the WHERE condition for a recipe search, or undefined when nothing is filtered.
// Every given filter must match. Recipes with no value in a range-filtered field are excluded.
export const searchFilter = (query: ListQuery): SQL | undefined => {
  const r = recipesTable;
  const conditions: (SQL | undefined)[] = [];

  if (query.q) {
    conditions.push(or(ilike(r.name, contains(query.q)), ilike(r.cuisine, contains(query.q))));
  }
  if (query.name) conditions.push(ilike(r.name, contains(query.name)));
  if (query.cuisine) conditions.push(ilike(r.cuisine, contains(query.cuisine)));

  for (const field of ['ingredients', 'instructions', 'tags'] as const) {
    for (const term of query[field] ?? []) {
      conditions.push(arrayItemContains(r[field], term));
    }
  }

  if (query.difficulty) conditions.push(inArray(r.difficulty, query.difficulty));
  if (query.mealTypes) conditions.push(arrayOverlaps(r.mealTypes, query.mealTypes));

  for (const field of RANGE_FIELDS) {
    const min = query[`${field}Min`];
    const max = query[`${field}Max`];

    if (min !== undefined) conditions.push(gte(r[field], min));
    if (max !== undefined) conditions.push(lte(r[field], max));
  }

  return and(...conditions);
};
