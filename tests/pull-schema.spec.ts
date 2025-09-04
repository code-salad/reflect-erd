import { strict as assert } from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { describe, test } from 'node:test';
import { env } from '../src/config';
import { DatabaseService } from '../src/services/database';

describe('database pull schema', () => {
  test(
    'should pull postgres schema from database',
    { timeout: 15_000 },
    async () => {
      const db = DatabaseService.fromUrl(env.POSTGRES_URL);
      const schema = await db.getAllSchemas();
      assert.ok(schema);
      await writeFile('schemas/postgres.json', JSON.stringify(schema, null, 2));
    }
  );

  test(
    'should pull mysql schema from database',
    { timeout: 15_000 },
    async () => {
      const db = DatabaseService.fromUrl(env.MYSQL_URL);
      const schema = await db.getAllSchemas();
      assert.ok(schema);
      await writeFile('schemas/mysql.json', JSON.stringify(schema, null, 2));
    }
  );
});
