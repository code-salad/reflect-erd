import { describe, expect, test } from 'bun:test';
import { env } from '../env';
import { DatabaseService } from '../src/services/database';

describe('debug sample data', () => {
  test('simple postgres test', async () => {
    const db = new DatabaseService({ databaseUrl: env.POSTGRES_URL });

    const schema = await db.pullSchema();

    if (schema.length > 0) {
      const firstTable = schema[0];
      if (firstTable) {
        const sampleData = await db.pullSampleData({
          table: `${firstTable.schema}.${firstTable.name}`,
        });
        expect(sampleData).toBeInstanceOf(Array);
      }
    }
  }, 30_000); // 30 second timeout
});
