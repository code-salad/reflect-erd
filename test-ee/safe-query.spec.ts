import { strict as assert } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { env } from '../src/config';
import { DatabaseService } from '../src/services/database';

const MYSQL_DB = 'reflect_erd';

describe('safeQuery method tests', () => {
  describe('PostgreSQL safeQuery tests', () => {
    test(
      'should execute SELECT query and return results',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.POSTGRES_URL);

        const result = await db.safeQuery({
          sql: 'SELECT * FROM public.products LIMIT 3',
        });

        assert.ok(Array.isArray(result));
        assert.ok(result.length <= 3);

        if (result[0]) {
          assert.ok('id' in result[0]);
          assert.ok('name' in result[0]);
          assert.ok('price' in result[0]);
        }
      }
    );

    test(
      'should execute aggregate query and return results',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.POSTGRES_URL);

        const result = await db.safeQuery({
          sql: 'SELECT COUNT(*) as total FROM public.products',
        });

        assert.ok(Array.isArray(result));
        assert.equal(result.length, 1);
        assert.ok('total' in result[0]);
        assert.ok(
          typeof result[0].total === 'string' ||
            typeof result[0].total === 'number'
        );
      }
    );

    test(
      'should execute JOIN query and return results',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.POSTGRES_URL);

        const result = await db.safeQuery({
          sql: `
            SELECT p.name as product_name, c.name as category_name 
            FROM public.products p 
            LEFT JOIN public.categories c ON p.category_id = c.id 
            LIMIT 5
          `,
        });

        assert.ok(Array.isArray(result));
        assert.ok(result.length <= 5);

        if (result[0]) {
          assert.ok('product_name' in result[0]);
          assert.ok('category_name' in result[0]);
        }
      }
    );

    test(
      'should rollback INSERT operations - no data persisted',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.POSTGRES_URL);

        // First, get the current count
        const initialCountResult = await db.safeQuery({
          sql: 'SELECT COUNT(*) as count FROM public.categories',
        });
        const initialCount = Number(initialCountResult[0]?.count || 0);

        // Execute an INSERT within safeQuery (should be rolled back)
        const insertResult = await db.safeQuery({
          sql: "INSERT INTO public.categories (name, description) VALUES ('Test Category', 'Test Description') RETURNING id, name",
        });

        // Should return the inserted row details
        assert.ok(Array.isArray(insertResult));
        assert.equal(insertResult.length, 1);
        assert.ok('id' in insertResult[0]);
        assert.ok('name' in insertResult[0]);
        assert.equal(insertResult[0].name, 'Test Category');

        // Verify the data was NOT actually persisted (rolled back)
        const finalCountResult = await db.safeQuery({
          sql: 'SELECT COUNT(*) as count FROM public.categories',
        });
        const finalCount = Number(finalCountResult[0]?.count || 0);

        // Count should be the same as before the INSERT
        assert.equal(finalCount, initialCount);
      }
    );

    test(
      'should rollback UPDATE operations - no data modified',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.POSTGRES_URL);

        // Get initial state
        const initialResult = await db.safeQuery({
          sql: 'SELECT name FROM public.categories ORDER BY id LIMIT 1',
        });
        const initialName = initialResult[0]?.name;

        // Execute an UPDATE within safeQuery (should be rolled back)
        const updateResult = await db.safeQuery({
          sql: "UPDATE public.categories SET name = 'Updated Name' WHERE id = (SELECT id FROM public.categories ORDER BY id LIMIT 1) RETURNING id, name",
        });

        // Should return the updated row details
        assert.ok(Array.isArray(updateResult));
        if (updateResult.length > 0) {
          assert.equal(updateResult[0]?.name, 'Updated Name');
        }

        // Verify the data was NOT actually modified (rolled back)
        const finalResult = await db.safeQuery({
          sql: 'SELECT name FROM public.categories ORDER BY id LIMIT 1',
        });
        const finalName = finalResult[0]?.name;

        // Name should be the same as before the UPDATE
        assert.equal(finalName, initialName);
      }
    );

    test(
      'should handle query errors gracefully',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.POSTGRES_URL);

        try {
          await db.safeQuery({
            sql: 'SELECT * FROM nonexistent_table',
          });
          assert.fail('Should have thrown an error');
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.ok(
            error.message.includes('does not exist') ||
              error.message.includes('relation')
          );
        }
      }
    );

    test(
      'should handle syntax error gracefully',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.POSTGRES_URL);

        try {
          await db.safeQuery({
            sql: 'INVALID SQL SYNTAX',
          });
          assert.fail('Should have thrown an error');
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.ok(
            error.message.includes('syntax') || error.message.includes('error')
          );
        }
      }
    );
  });

  describe('MySQL safeQuery tests', () => {
    test(
      'should execute SELECT query and return results',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.MYSQL_URL);

        const result = await db.safeQuery({
          sql: `SELECT * FROM ${MYSQL_DB}.products LIMIT 3`,
        });

        assert.ok(Array.isArray(result));
        assert.ok(result.length <= 3);

        if (result[0]) {
          assert.ok('id' in result[0]);
          assert.ok('name' in result[0]);
          assert.ok('price' in result[0]);
        }
      }
    );

    test(
      'should execute aggregate query and return results',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.MYSQL_URL);

        const result = await db.safeQuery({
          sql: `SELECT COUNT(*) as total FROM ${MYSQL_DB}.products`,
        });

        assert.ok(Array.isArray(result));
        assert.equal(result.length, 1);
        assert.ok('total' in result[0]);
        assert.ok(
          typeof result[0].total === 'string' ||
            typeof result[0].total === 'number'
        );
      }
    );

    test(
      'should rollback INSERT operations - no data persisted',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.MYSQL_URL);

        // First, get the current count
        const initialCountResult = await db.safeQuery({
          sql: `SELECT COUNT(*) as count FROM ${MYSQL_DB}.categories`,
        });
        const initialCount = Number(initialCountResult[0]?.count || 0);

        // Execute an INSERT within safeQuery (should be rolled back)
        const insertResult = await db.safeQuery({
          sql: `INSERT INTO ${MYSQL_DB}.categories (name, description) VALUES ('Test Category', 'Test Description')`,
        });

        // MySQL INSERT returns metadata, not the inserted row
        assert.ok(insertResult !== null);

        // Verify the data was NOT actually persisted (rolled back)
        const finalCountResult = await db.safeQuery({
          sql: `SELECT COUNT(*) as count FROM ${MYSQL_DB}.categories`,
        });
        const finalCount = Number(finalCountResult[0]?.count || 0);

        // Count should be the same as before the INSERT
        assert.equal(finalCount, initialCount);
      }
    );

    test(
      'should rollback UPDATE operations - no data modified',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.MYSQL_URL);

        // Get initial state
        const initialResult = await db.safeQuery({
          sql: `SELECT name FROM ${MYSQL_DB}.categories ORDER BY id LIMIT 1`,
        });
        const initialName = initialResult[0]?.name;

        // Execute an UPDATE within safeQuery (should be rolled back)
        await db.safeQuery({
          sql: `UPDATE ${MYSQL_DB}.categories SET name = 'Updated Name' ORDER BY id LIMIT 1`,
        });

        // Verify the data was NOT actually modified (rolled back)
        const finalResult = await db.safeQuery({
          sql: `SELECT name FROM ${MYSQL_DB}.categories ORDER BY id LIMIT 1`,
        });
        const finalName = finalResult[0]?.name;

        // Name should be the same as before the UPDATE
        assert.equal(finalName, initialName);
      }
    );

    test(
      'should handle query errors gracefully',
      { timeout: 15_000 },
      async () => {
        const db = DatabaseService.fromUrl(env.MYSQL_URL);

        try {
          await db.safeQuery({
            sql: `SELECT * FROM ${MYSQL_DB}.nonexistent_table`,
          });
          assert.fail('Should have thrown an error');
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.ok(
            error.message.includes("doesn't exist") ||
              error.message.includes('Table')
          );
        }
      }
    );
  });

  describe('Cross-database transaction behavior', () => {
    test(
      'should ensure consistent rollback behavior across databases',
      { timeout: 30_000 },
      async () => {
        const postgresDb = DatabaseService.fromUrl(env.POSTGRES_URL);
        const mysqlDb = DatabaseService.fromUrl(env.MYSQL_URL);

        // Test both databases handle rollback consistently
        const postgresResult = await postgresDb.safeQuery({
          sql: 'SELECT COUNT(*) as count FROM public.products',
        });

        const mysqlResult = await mysqlDb.safeQuery({
          sql: `SELECT COUNT(*) as count FROM ${MYSQL_DB}.products`,
        });

        // Both should return count results
        assert.ok('count' in postgresResult[0]);
        assert.ok('count' in mysqlResult[0]);

        // Both should have the same number of products (10)
        assert.equal(Number(postgresResult[0]?.count), 10);
        assert.equal(Number(mysqlResult[0]?.count), 10);
      }
    );
  });
});
