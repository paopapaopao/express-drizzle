import { defineConfig } from 'drizzle-kit';

// Load .env for local runs. On Railway, DATABASE_URL is already set and there's no .env.
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
