import { writeFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { env } from '../env';
import { DatabaseService } from '../src/services/database';

describe('database pull schema', () => {
  test('should pull postgres schema from database', async () => {
    const db = DatabaseService.fromUrl(env.POSTGRES_URL);
    const schema = await db.getAllSchemas();
    expect(schema).not.toBeNull();
    await writeFile('schemas/postgres.json', JSON.stringify(schema, null, 2));
  }, 15_000);
  test('should pull mysql schema from database', async () => {
    const db = DatabaseService.fromUrl(env.MYSQL_URL);
    const schema = await db.getAllSchemas();
    expect(schema).not.toBeNull();
    await writeFile('schemas/mysql.json', JSON.stringify(schema, null, 2));
  }, 15_000);
});
//# sourceMappingURL=pull-schema.spec.js.map
