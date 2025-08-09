import { describe, expect, test } from 'bun:test';
import { env } from '../env';
import { DatabaseService } from '../src/services/database';

describe('database pull schema', () => {
  test('should pull postgres schema from database', async () => {
    const db = new DatabaseService({ databaseUrl: env.POSTGRES_URL });
    const schema = await db.pullSchema();
    expect(schema).not.toBeNull();
    await Bun.write('schemas/postgres.json', JSON.stringify(schema, null, 2));
  });

  test('should pull mysql schema from database', async () => {
    const db = new DatabaseService({ databaseUrl: env.MYSQL_URL });
    const schema = await db.pullSchema();
    expect(schema).not.toBeNull();
    await Bun.write('schemas/mysql.json', JSON.stringify(schema, null, 2));
  }, 15_000);
});
