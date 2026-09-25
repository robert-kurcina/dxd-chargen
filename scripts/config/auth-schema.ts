// Schema generation only. No database connection, routes or outbound email.
import { betterAuth } from 'better-auth';
import { username, twoFactor } from 'better-auth/plugins';
export const auth = betterAuth({
  appName: 'Sarna Len',
  baseURL: 'http://127.0.0.1:3000',
  secret: 'schema-generation-only-not-a-runtime-secret-00000000',
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  plugins: [username(), twoFactor()],
  advanced: { database: { generateId: 'uuid' } },
});
