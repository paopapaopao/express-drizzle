# express-drizzle

A recipes REST API built with [Express 5](https://expressjs.com/), TypeScript and [Drizzle ORM](https://orm.drizzle.team/) on PostgreSQL.

TypeScript files run directly with Node.js's built-in type stripping, so there is no build step.

## Requirements

- [Node.js](https://nodejs.org/) v22.18 or later, which can run `.ts` files natively (developed on v26)
- [pnpm](https://pnpm.io/)
- A PostgreSQL database (local, or hosted such as Railway)

## Getting started

```bash
# install dependencies
pnpm install

# set your database connection string
cp .env.example .env   # then edit DATABASE_URL

# create the tables (development)
pnpm db:push

# fill the database with sample recipes
pnpm db:seed

# start the dev server (restarts on file changes)
pnpm dev
```

The server runs at http://localhost:4000.

## Scripts

| Command            | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `pnpm dev`         | Start the server in watch mode, loading `.env`          |
| `pnpm start`       | Start the server (expects env vars to already be set)   |
| `pnpm typecheck`   | Type-check the project (emits no files)                 |
| `pnpm db:generate` | Generate a SQL migration from schema changes            |
| `pnpm db:migrate`  | Apply pending migrations to the database                |
| `pnpm db:push`     | Sync the schema to the database directly (no migration) |
| `pnpm db:studio`   | Open Drizzle Studio to browse the database              |
| `pnpm db:seed`     | Replace all recipes with sample data from DummyJSON     |

Node strips types without checking them, so run `pnpm typecheck` to catch type errors.

## API

| Method   | Path           | Description                    |
| -------- | -------------- | ------------------------------ |
| `GET`    | `/recipes`     | List all recipes               |
| `GET`    | `/recipes/:id` | Get one recipe                 |
| `POST`   | `/recipes`     | Create a recipe (`201`)        |
| `PATCH`  | `/recipes/:id` | Update some fields of a recipe |
| `DELETE` | `/recipes/:id` | Delete a recipe (`204`)        |

Request bodies are JSON and are validated against the table definition. Invalid input returns `400` with the problem fields; a missing recipe returns `404`.

## Database workflow

The schema lives in `src/db/schema.ts`; Drizzle Kit reads it via `drizzle.config.ts`.

- **Local development:** edit the schema, then `pnpm db:push` to apply it straight to your database.
- **Production:** edit the schema, run `pnpm db:generate` to write a reviewable SQL migration into `drizzle/`, commit it, and run `pnpm db:migrate` against the production database.

### Seeding

`pnpm db:seed` downloads the 50 recipes from [DummyJSON](https://dummyjson.com/recipes), converts them to this schema (renamed fields, lowercase difficulty and meal types), and inserts them.

> **Warning:** it deletes every existing recipe first. Only run it against a development database.

The seed needs internet access, and recipe ids keep counting up on each run (deleting rows doesn't reset the id counter).

## Project structure

```
drizzle/              # generated SQL migrations (from db:generate)
drizzle.config.ts     # Drizzle Kit config: dialect, schema path, credentials
src/
├── app.ts            # Express app: middleware and routes (exported, no listen)
├── server.ts         # Entry point: imports the app and starts listening
├── db/
│   ├── index.ts      # Database client (`db`), connected via DATABASE_URL
│   ├── schema.ts     # Table definitions
│   └── seed.ts       # Seed script (pnpm db:seed)
└── routes/
    └── recipes.ts    # /recipes routes and request validation
```

Keeping `app.ts` separate from `server.ts` lets tests import the app without opening a port.

## TypeScript conventions

Because Node runs the `.ts` files as-is, the code follows a few rules (enforced by `tsconfig.json`):

- **Include the `.ts` extension in relative imports:** `import app from './app.ts'`
- **Mark type-only imports with `type`:** `import { type Request } from 'express'`
- **Use only erasable TypeScript syntax:** no `enum`, `namespace` or constructor parameter properties
