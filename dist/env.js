import dotenv from '@dotenvx/dotenvx';
import z from 'zod';

dotenv.config();
export const EnvSchema = z.object({
  POSTGRES_URL: z.string(),
  MYSQL_URL: z.string(),
});
export const env = EnvSchema.parse(process.env);
//# sourceMappingURL=env.js.map
