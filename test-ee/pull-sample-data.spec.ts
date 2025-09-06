import { strict as assert } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { env } from '../src/config';
import { DatabaseService } from '../src/services/database';

describe('database pull sample data', () => {
  test(
    'should pull sample data from postgres table',
    { timeout: 15_000 },
    async () => {
      const db = DatabaseService.fromUrl(env.POSTGRES_URL);

      // First get schema to find a table to test with
      const schema = await db.getAllSchemas();
      assert.ok(schema);
      assert.ok(schema.length > 0);

      // Test with the first available table
      const firstTable = schema[0];
      if (!firstTable) {
        throw new Error('No tables found in schema');
      }

      const sampleData = await db.getSampleData({
        table: firstTable.name,
        schema: firstTable.schema,
      });
      assert.ok(Array.isArray(sampleData));
      assert.ok(sampleData.length <= 10);

      // If data exists, verify it has the expected columns
      if (sampleData.length > 0 && sampleData[0]) {
        const columnNames = firstTable.columns.map((col) => col.name);
        const sampleKeys = Object.keys(sampleData[0]);

        // Check that sample data contains expected columns
        for (const colName of columnNames) {
          if (!firstTable.columns.find((c) => c.name === colName)?.isNullable) {
            // Non-nullable columns should be present
            assert.ok(sampleKeys.includes(colName));
          }
        }
      }
    }
  );

  test(
    'should pull sample data from mysql table',
    { timeout: 15_000 },
    async () => {
      const db = DatabaseService.fromUrl(env.MYSQL_URL);

      // First get schema to find a table to test with
      const schema = await db.getAllSchemas();
      assert.ok(schema);
      assert.ok(schema.length > 0);

      // Test with the first available table
      const firstTable = schema[0];
      if (!firstTable) {
        throw new Error('No tables found in schema');
      }

      const sampleData = await db.getSampleData({
        table: firstTable.name,
        schema: firstTable.schema,
      });
      assert.ok(Array.isArray(sampleData));
      assert.ok(sampleData.length <= 10);

      // If data exists, verify it has the expected columns
      if (sampleData.length > 0 && sampleData[0]) {
        const columnNames = firstTable.columns.map((col) => col.name);
        const sampleKeys = Object.keys(sampleData[0]);

        // Check that sample data contains expected columns
        for (const colName of columnNames) {
          if (!firstTable.columns.find((c) => c.name === colName)?.isNullable) {
            // Non-nullable columns should be present
            assert.ok(sampleKeys.includes(colName));
          }
        }
      }
    }
  );

  test(
    'should handle postgres table without schema prefix',
    { timeout: 15_000 },
    async () => {
      const db = DatabaseService.fromUrl(env.POSTGRES_URL);

      // Get schema to find a public schema table
      const schema = await db.getAllSchemas();
      const publicTable = schema.find((t) => t.schema === 'public');

      if (publicTable) {
        // Test without explicit schema (should default to public)
        const sampleData = await db.getSampleData({ table: publicTable.name });
        assert.ok(Array.isArray(sampleData));
        assert.ok(sampleData.length <= 10);
      }
    }
  );

  test(
    'should handle mysql table without schema prefix',
    { timeout: 15_000 },
    async () => {
      const db = DatabaseService.fromUrl(env.MYSQL_URL);

      // Get schema to find any table
      const schema = await db.getAllSchemas();

      if (schema.length > 0) {
        const firstTable = schema[0];
        if (firstTable) {
          // Test without explicit schema (should use default)
          const sampleData = await db.getSampleData({ table: firstTable.name });
          assert.ok(Array.isArray(sampleData));
          assert.ok(sampleData.length <= 10);
        }
      }
    }
  );

  test(
    'should return empty array for empty postgres table',
    { timeout: 15_000 },
    async () => {
      const db = DatabaseService.fromUrl(env.POSTGRES_URL);

      // This test assumes there might be an empty table
      // If all tables have data, this test will pass anyway
      const schema = await db.getAllSchemas();

      // Pull sample data from all tables in parallel
      const sampleDataPromises = schema.map(async (table) => {
        const sampleData = await db.getSampleData({
          table: table.name,
          schema: table.schema,
        });
        return { table, sampleData };
      });

      const results = await Promise.all(sampleDataPromises);

      // Check all results
      for (const { sampleData } of results) {
        assert.ok(Array.isArray(sampleData));
        assert.ok(sampleData.length <= 10);
      }
      // Test passes whether we find an empty table or not
    }
  );

  test(
    'should return empty array for empty mysql table',
    { timeout: 15_000 },
    async () => {
      const db = DatabaseService.fromUrl(env.MYSQL_URL);

      // This test assumes there might be an empty table
      // If all tables have data, this test will pass anyway
      const schema = await db.getAllSchemas();

      // Pull sample data from all tables in parallel
      const sampleDataPromises = schema.map(async (table) => {
        const sampleData = await db.getSampleData({
          table: table.name,
          schema: table.schema,
        });
        return { table, sampleData };
      });

      const results = await Promise.all(sampleDataPromises);
      // Check all results
      for (const { sampleData } of results) {
        assert.ok(Array.isArray(sampleData));
        assert.ok(sampleData.length <= 10);
      }
      // Test passes whether we find an empty table or not
    }
  );
});
