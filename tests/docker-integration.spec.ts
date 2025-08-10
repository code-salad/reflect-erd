import { describe, expect, test } from 'bun:test';
import { DatabaseService } from '../src/services/database';
import { TEST_MYSQL_URL, TEST_POSTGRES_URL } from './global-setup';

// Use the global test database URLs
const postgresUrl = process.env.TEST_POSTGRES_URL || TEST_POSTGRES_URL;
const mysqlUrl = process.env.TEST_MYSQL_URL || TEST_MYSQL_URL;
const MYSQL_DB = 'testdb';

describe('docker integration tests', () => {
  describe('PostgreSQL tests', () => {
    test('should connect and pull schema from PostgreSQL', async () => {
      const db = new DatabaseService({ databaseUrl: postgresUrl });

      const schema = await db.pullSchema();
      expect(schema).not.toBeNull();
      expect(schema.length).toBeGreaterThan(0);

      // Verify expected tables exist
      const tableNames = schema.map((t) => t.name);
      expect(tableNames).toContain('categories');
      expect(tableNames).toContain('customers');
      expect(tableNames).toContain('products');
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('order_items');
    }, 15_000);

    test('should pull sample data from PostgreSQL table', async () => {
      const db = new DatabaseService({ databaseUrl: postgresUrl });

      const sampleData = await db.pullSampleData({
        table: 'products',
        schema: 'public',
      });

      expect(sampleData).toBeInstanceOf(Array);
      expect(sampleData.length).toBeGreaterThan(0);
      expect(sampleData.length).toBeLessThanOrEqual(10);

      // Verify data structure
      if (sampleData[0]) {
        expect(sampleData[0]).toHaveProperty('id');
        expect(sampleData[0]).toHaveProperty('name');
        expect(sampleData[0]).toHaveProperty('price');
      }
    }, 15_000);

    test('should handle PostgreSQL views', async () => {
      const db = new DatabaseService({ databaseUrl: postgresUrl });

      const schema = await db.pullSchema();
      const view = schema.find((t) => t.name === 'order_summary');

      // Views are returned as regular tables in the schema
      expect(view).toBeDefined();
      expect(view?.name).toBe('order_summary');
    }, 15_000);

    test('should handle multiple PostgreSQL schemas', async () => {
      const db = new DatabaseService({ databaseUrl: postgresUrl });

      const schema = await db.pullSchema();

      // Check for both public and test_schema
      const publicTables = schema.filter((t) => t.schema === 'public');
      const testSchemaTables = schema.filter((t) => t.schema === 'test_schema');

      expect(publicTables.length).toBeGreaterThan(0);
      expect(testSchemaTables.length).toBeGreaterThan(0);

      // Verify test_schema.users exists
      const usersTable = schema.find(
        (t) => t.schema === 'test_schema' && t.name === 'users'
      );
      expect(usersTable).toBeDefined();
    }, 15_000);
  });

  describe('MySQL tests', () => {
    test('should connect and pull schema from MySQL', async () => {
      const db = new DatabaseService({ databaseUrl: mysqlUrl });

      const schema = await db.pullSchema();
      expect(schema).not.toBeNull();
      expect(schema.length).toBeGreaterThan(0);

      // Verify expected tables exist
      const tableNames = schema.map((t) => t.name);
      expect(tableNames).toContain('categories');
      expect(tableNames).toContain('customers');
      expect(tableNames).toContain('products');
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('order_items');
      expect(tableNames).toContain('product_reviews');
      expect(tableNames).toContain('page_views');
    }, 15_000);

    test('should pull sample data from MySQL table', async () => {
      const db = new DatabaseService({ databaseUrl: mysqlUrl });

      const sampleData = await db.pullSampleData({
        table: 'customers',
        schema: MYSQL_DB,
      });

      expect(sampleData).toBeInstanceOf(Array);
      expect(sampleData.length).toBe(5); // We inserted 5 customers

      // Verify data structure
      if (sampleData[0]) {
        expect(sampleData[0]).toHaveProperty('id');
        expect(sampleData[0]).toHaveProperty('email');
        expect(sampleData[0]).toHaveProperty('first_name');
        expect(sampleData[0]).toHaveProperty('last_name');
      }
    }, 15_000);

    test('should handle MySQL views', async () => {
      const db = new DatabaseService({ databaseUrl: mysqlUrl });

      const schema = await db.pullSchema();
      const view = schema.find((t) => t.name === 'order_summary');

      // Views are returned as regular tables in the schema
      expect(view).toBeDefined();
      expect(view?.name).toBe('order_summary');
    }, 15_000);

    test('should handle empty MySQL table', async () => {
      const db = new DatabaseService({ databaseUrl: mysqlUrl });

      // inventory_logs table is empty
      const sampleData = await db.pullSampleData({
        table: 'inventory_logs',
        schema: MYSQL_DB,
      });

      expect(sampleData).toBeInstanceOf(Array);
      expect(sampleData.length).toBe(0);
    }, 15_000);

    test('should handle MySQL table with foreign keys', async () => {
      const db = new DatabaseService({ databaseUrl: mysqlUrl });

      const schema = await db.pullSchema();
      const orderItemsTable = schema.find((t) => t.name === 'order_items');

      expect(orderItemsTable).toBeDefined();

      // Check foreign key relationships
      const foreignKeys = orderItemsTable?.foreignKeys || [];
      expect(foreignKeys.length).toBeGreaterThan(0);

      // Should have foreign keys to orders and products
      const orderFk = foreignKeys.find((fk) => fk.columns.includes('order_id'));
      const productFk = foreignKeys.find((fk) =>
        fk.columns.includes('product_id')
      );

      expect(orderFk).toBeDefined();
      expect(productFk).toBeDefined();
      expect(orderFk?.referencedTable).toBe('orders');
      expect(productFk?.referencedTable).toBe('products');
    }, 15_000);
  });

  describe('Cross-database comparison', () => {
    test('should have similar table structures in both databases', async () => {
      const postgresDb = new DatabaseService({ databaseUrl: postgresUrl });
      const mysqlDb = new DatabaseService({ databaseUrl: mysqlUrl });

      const postgresSchema = await postgresDb.pullSchema();
      const mysqlSchema = await mysqlDb.pullSchema();

      // Find common tables
      const commonTables = [
        'categories',
        'customers',
        'products',
        'orders',
        'order_items',
      ];

      for (const tableName of commonTables) {
        const pgTable = postgresSchema.find(
          (t) => t.name === tableName && t.schema === 'public'
        );
        const myTable = mysqlSchema.find((t) => t.name === tableName);

        expect(pgTable).toBeDefined();
        expect(myTable).toBeDefined();

        // Both should have similar column counts (might differ slightly due to DB differences)
        if (pgTable && myTable) {
          expect(
            Math.abs(pgTable.columns.length - myTable.columns.length)
          ).toBeLessThanOrEqual(2);
        }
      }
    }, 30_000);

    test('should retrieve similar sample data from both databases', async () => {
      const postgresDb = new DatabaseService({ databaseUrl: postgresUrl });
      const mysqlDb = new DatabaseService({ databaseUrl: mysqlUrl });

      const pgProducts = await postgresDb.pullSampleData({
        table: 'products',
        schema: 'public',
      });

      const myProducts = await mysqlDb.pullSampleData({
        table: 'products',
        schema: MYSQL_DB,
      });

      // Both should return the same number of products
      expect(pgProducts.length).toBe(10);
      expect(myProducts.length).toBe(10);

      // Verify first product has same name in both
      if (pgProducts[0] && myProducts[0]) {
        expect(pgProducts[0].name).toBe(myProducts[0].name);
        expect(pgProducts[0].price).toBe(myProducts[0].price);
      }
    }, 30_000);
  });
});
