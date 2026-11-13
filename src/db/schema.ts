import { sql } from 'drizzle-orm';
import { check, integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);

export const mealTypeEnum = pgEnum('mealType', [
  'breakfast',
  'lunch',
  'dinner',
  'beverage',
  'snack',
  'side dish',
  'appetizer',
  'dessert',
]);

export const recipesTable = pgTable(
  'recipes',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    name: text().notNull(),
    image: text().notNull(),
    ingredients: text().array().notNull(),
    instructions: text().array().notNull(),

    // In minutes
    prepTime: integer(),
    // In minutes
    cookTime: integer(),
    difficulty: difficultyEnum(),
    servings: integer(),
    // Per serving
    calories: integer(),
    cuisine: text(),
    mealTypes: mealTypeEnum().array(),
    tags: text().array(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check('recipes_ingredients_not_empty', sql`cardinality(${table.ingredients}) > 0`),
    check('recipes_instructions_not_empty', sql`cardinality(${table.instructions}) > 0`),
  ],
);
