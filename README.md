# express-drizzle

A REST API built with [Express 5](https://expressjs.com/), TypeScript and [Drizzle ORM](https://orm.drizzle.team/) on PostgreSQL.

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

# start the dev server (restarts on file changes)
pnpm dev
```

The server runs at http://localhost:3000.

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

Node strips types without checking them, so run `pnpm typecheck` to catch type errors.

## Database workflow

The schema lives in `src/db/schema.ts`; Drizzle Kit reads it via `drizzle.config.ts`.

- **Local development:** edit the schema, then `pnpm db:push` to apply it straight to your database.
- **Production:** edit the schema, run `pnpm db:generate` to write a reviewable SQL migration into `drizzle/`, commit it, and run `pnpm db:migrate` against the production database.

## Project structure

```
drizzle/              # generated SQL migrations (from db:generate)
drizzle.config.ts     # Drizzle Kit config: dialect, schema path, credentials
src/
├── app.ts            # Express app: middleware and routes (exported, no listen)
├── server.ts         # Entry point: imports the app and starts listening
└── db/
    ├── index.ts      # Database client (`db`), connected via DATABASE_URL
    └── schema.ts     # Table definitions
```

Keeping `app.ts` separate from `server.ts` lets tests import the app without opening a port.

## TypeScript conventions

Because Node runs the `.ts` files as-is, the code follows a few rules (enforced by `tsconfig.json`):

- **Include the `.ts` extension in relative imports:** `import app from './app.ts'`
- **Mark type-only imports with `type`:** `import { type Request } from 'express'`
- **Use only erasable TypeScript syntax:** no `enum`, `namespace` or constructor parameter properties
