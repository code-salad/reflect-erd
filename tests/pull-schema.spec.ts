import { strict as assert } from 'node:assert/strict';
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
    }
  );

  test(
    'should pull mysql schema from database',
    { timeout: 15_000 },
    async () => {
      const db = DatabaseService.fromUrl(env.MYSQL_URL);
      const schema = await db.getAllSchemas();
      assert.ok(schema);
    }
  );
});
