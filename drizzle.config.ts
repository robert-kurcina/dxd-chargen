import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/db/auth-schema.ts',
  out: './migrations/auth',
});
