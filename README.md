# express-drizzle

A REST API built with [Express 5](https://expressjs.com/) and TypeScript, with [Drizzle ORM](https://orm.drizzle.team/) planned for database access.

TypeScript files run directly with Node.js's built-in type stripping, so there is no build step.

## Requirements

- [Node.js](https://nodejs.org/) v22.18 or later, which can run `.ts` files natively (developed on v26)
- [pnpm](https://pnpm.io/)

## Getting started

```bash
# install dependencies
pnpm install

# start the dev server (restarts on file changes)
pnpm dev
```

The server runs at http://localhost:3000.

## Scripts

| Command         | Description                                     |
| --------------- | ----------------------------------------------- |
| `pnpm dev`      | Start the server in watch mode (`node --watch`) |
| `pnpm start`    | Start the server                                |
| `pnpm exec tsc` | Type-check the project (emits no files)         |

Node strips types without checking them, so run `tsc` to catch type errors.

## Project structure

```
src/
├── app.ts      # Express app: middleware and routes (exported, no listen)
└── server.ts   # Entry point: imports the app and starts listening
```

Keeping `app.ts` separate from `server.ts` lets tests import the app without opening a port.

## TypeScript conventions

Because Node runs the `.ts` files as-is, the code follows a few rules (enforced by `tsconfig.json`):

- **Include the `.ts` extension in relative imports:** `import app from './app.ts'`
- **Mark type-only imports with `type`:** `import { type Request } from 'express'`
- **Use only erasable TypeScript syntax:** no `enum`, `namespace` or constructor parameter properties
