import { describe, expect, test } from 'vitest';
import { DatabaseService } from '../src/services/database';
import type { TableReference } from '../src/services/database-provider/types';
import { TEST_MYSQL_URL, TEST_POSTGRES_URL } from './global-setup';

// Use the global test database URLs
const postgresUrl = process.env.TEST_POSTGRES_URL || TEST_POSTGRES_URL;
const mysqlUrl = process.env.TEST_MYSQL_URL || TEST_MYSQL_URL;
const MYSQL_DB = 'reflect_erd';

describe('docker integration tests', () => {
  describe('PostgreSQL tests', () => {
    test('should connect and pull schema from PostgreSQL', async () => {
      const db = DatabaseService.fromUrl(postgresUrl);

      const schema = await db.getAllSchemas();
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
      const db = DatabaseService.fromUrl(postgresUrl);

      const sampleData = await db.getSampleData({
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

    // biome-ignore lint/suspicious/noSkippedTests: Views not implemented in seed data yet
    test.skip('should handle PostgreSQL views', async () => {
      const db = DatabaseService.fromUrl(postgresUrl);

      const schema = await db.getAllSchemas();
      const view = schema.find((t) => t.name === 'order_summary');

      // Views are returned as regular tables in the schema
      expect(view).toBeDefined();
      expect(view?.name).toBe('order_summary');
    }, 15_000);

    test('should handle multiple PostgreSQL schemas', async () => {
      const db = DatabaseService.fromUrl(postgresUrl);

      const schema = await db.getAllSchemas();

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

    test('should find shortest join path between two directly connected tables', async () => {
      const db = DatabaseService.fromUrl(postgresUrl);

      const tables: TableReference[] = [
        { schema: 'public', table: 'orders' },
        { schema: 'public', table: 'customers' },
      ];

      const result = await db.getTableJoins({ tables });
      const path = result?.joinPath;

      expect(path).not.toBeNull();
      expect(path?.tables.length).toBe(2);
      expect(path?.relations.length).toBe(1);
      expect(path?.totalJoins).toBe(1);

      // Check the relation details
      const relation = path?.relations[0];
      expect(relation?.from.table).toBe('orders');
      expect(relation?.from.columns).toContain('customer_id');
      expect(relation?.to.table).toBe('customers');
      expect(relation?.to.columns).toContain('id');
    }, 15_000);

    test('should find path with intermediate table', async () => {
      const db = DatabaseService.fromUrl(postgresUrl);

      const tables: TableReference[] = [
        { schema: 'public', table: 'orders' },
        { schema: 'public', table: 'products' },
      ];

      const result = await db.getTableJoins({ tables });
      const path = result?.joinPath;

      expect(path).not.toBeNull();
      expect(path?.tables.length).toBeGreaterThan(2); // Should include order_items
      expect(path?.relations.length).toBeGreaterThanOrEqual(2);

      // Verify intermediate table is included
      const tableNames = path?.tables.map((t: TableReference) => t.table);
      expect(tableNames).toContain('order_items');
    }, 15_000);

    test('should connect multiple tables', async () => {
      const db = DatabaseService.fromUrl(postgresUrl);

      const tables: TableReference[] = [
        { schema: 'public', table: 'customers' },
        { schema: 'public', table: 'orders' },
        { schema: 'public', table: 'products' },
      ];

      const result = await db.getTableJoins({ tables });
      const path = result?.joinPath;

      expect(path).not.toBeNull();
      expect(path?.inputTablesCount).toBe(3);
      expect(path?.totalTablesCount).toBeGreaterThanOrEqual(3);
      expect(path?.relations.length).toBeGreaterThanOrEqual(2);
    }, 15_000);

    test('should handle single table input', async () => {
      const db = DatabaseService.fromUrl(postgresUrl);

      const tables: TableReference[] = [
        { schema: 'public', table: 'customers' },
      ];

      const result = await db.getTableJoins({ tables });
      const path = result?.joinPath;

      expect(path).not.toBeNull();
      expect(path?.tables.length).toBe(1);
      expect(path?.relations.length).toBe(0);
      expect(path?.totalJoins).toBe(0);
    }, 15_000);

    test('should return null for empty input', async () => {
      const db = DatabaseService.fromUrl(postgresUrl);

      const tables: TableReference[] = [];

      const result = await db.getTableJoins({ tables });

      expect(result).toBeNull();
    }, 15_000);

    test('should handle tables from different schemas', async () => {
      const db = DatabaseService.fromUrl(postgresUrl);

      const tables: TableReference[] = [
        { schema: 'public', table: 'orders' },
        { schema: 'test_schema', table: 'users' },
      ];

      const result = await db.getTableJoins({ tables });

      // These tables aren't connected, so should return null
      expect(result).toBeNull();
    }, 15_000);
  });

  describe('MySQL tests', () => {
    test('should connect and pull schema from MySQL', async () => {
      const db = DatabaseService.fromUrl(mysqlUrl);

      const schema = await db.getAllSchemas();
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
      const db = DatabaseService.fromUrl(mysqlUrl);

      const sampleData = await db.getSampleData({
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

    // biome-ignore lint/suspicious/noSkippedTests: Views not implemented in seed data yet
    test.skip('should handle MySQL views', async () => {
      const db = DatabaseService.fromUrl(mysqlUrl);

      const schema = await db.getAllSchemas();
      const view = schema.find((t) => t.name === 'order_summary');

      // Views are returned as regular tables in the schema
      expect(view).toBeDefined();
      expect(view?.name).toBe('order_summary');
    }, 15_000);

    test('should handle empty MySQL table', async () => {
      const db = DatabaseService.fromUrl(mysqlUrl);

      // inventory_logs table is empty
      const sampleData = await db.getSampleData({
        table: 'inventory_logs',
        schema: MYSQL_DB,
      });

      expect(sampleData).toBeInstanceOf(Array);
      expect(sampleData.length).toBe(0);
    }, 15_000);

    test('should handle MySQL table with foreign keys', async () => {
      const db = DatabaseService.fromUrl(mysqlUrl);

      const schema = await db.getAllSchemas();
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

    test('should find shortest join path between MySQL tables', async () => {
      const db = DatabaseService.fromUrl(mysqlUrl);

      const tables: TableReference[] = [
        { schema: MYSQL_DB, table: 'orders' },
        { schema: MYSQL_DB, table: 'customers' },
      ];

      const result = await db.getTableJoins({ tables });
      const path = result?.joinPath;

      expect(path).not.toBeNull();
      expect(path?.tables.length).toBe(2);
      expect(path?.relations.length).toBe(1);
      expect(path?.totalJoins).toBe(1);

      // Check the relation details
      const relation = path?.relations[0];
      expect(relation?.from.table).toBe('orders');
      expect(relation?.from.columns).toContain('customer_id');
      expect(relation?.to.table).toBe('customers');
      expect(relation?.to.columns).toContain('id');
    }, 15_000);

    test('should find path with intermediate table in MySQL', async () => {
      const db = DatabaseService.fromUrl(mysqlUrl);

      const tables: TableReference[] = [
        { schema: MYSQL_DB, table: 'orders' },
        { schema: MYSQL_DB, table: 'products' },
      ];

      const result = await db.getTableJoins({ tables });
      const path = result?.joinPath;

      expect(path).not.toBeNull();
      expect(path?.tables.length).toBeGreaterThan(2); // Should include order_items
      expect(path?.relations.length).toBeGreaterThanOrEqual(2);

      // Verify intermediate table is included
      const tableNames = path?.tables.map((t: TableReference) => t.table);
      expect(tableNames).toContain('order_items');
    }, 15_000);

    test('should connect multiple MySQL tables', async () => {
      const db = DatabaseService.fromUrl(mysqlUrl);

      const tables: TableReference[] = [
        { schema: MYSQL_DB, table: 'customers' },
        { schema: MYSQL_DB, table: 'orders' },
        { schema: MYSQL_DB, table: 'products' },
        { schema: MYSQL_DB, table: 'categories' },
      ];

      const result = await db.getTableJoins({ tables });
      const path = result?.joinPath;

      expect(path).not.toBeNull();
      expect(path?.inputTablesCount).toBe(4);
      expect(path?.totalTablesCount).toBeGreaterThanOrEqual(4);
      expect(path?.relations.length).toBeGreaterThanOrEqual(3);
    }, 15_000);

    test('should handle nullable foreign keys in MySQL', async () => {
      const db = DatabaseService.fromUrl(mysqlUrl);

      const tables: TableReference[] = [
        { schema: MYSQL_DB, table: 'products' },
        { schema: MYSQL_DB, table: 'categories' },
      ];

      const result = await db.getTableJoins({ tables });
      const path = result?.joinPath;

      expect(path).not.toBeNull();
      expect(path?.relations.length).toBe(1);

      // Check if nullable FK is detected
      const relation = path?.relations[0];
      if (
        relation?.from.table === 'products' &&
        relation?.from.columns.includes('category_id')
      ) {
        // category_id might be nullable in products table
        expect(relation?.isNullable).toBeDefined();
      }
    }, 15_000);

    test('should handle MySQL single table input', async () => {
      const db = DatabaseService.fromUrl(mysqlUrl);

      const tables: TableReference[] = [
        { schema: MYSQL_DB, table: 'customers' },
      ];

      const result = await db.getTableJoins({ tables });
      const path = result?.joinPath;

      expect(path).not.toBeNull();
      expect(path?.tables.length).toBe(1);
      expect(path?.relations.length).toBe(0);
      expect(path?.totalJoins).toBe(0);
    }, 15_000);

    test('should return null for unconnected MySQL tables', async () => {
      const db = DatabaseService.fromUrl(mysqlUrl);

      const tables: TableReference[] = [
        { schema: MYSQL_DB, table: 'inventory_logs' },
        { schema: MYSQL_DB, table: 'page_views' },
      ];

      const result = await db.getTableJoins({ tables });

      // If these tables aren't connected through FKs, should return null
      // or find a very long path through multiple intermediate tables
      if (result) {
        const path = result.joinPath;
        expect(path?.relations.length).toBeGreaterThan(2); // Long path
      } else {
        expect(result).toBeNull(); // No connection
      }
    }, 15_000);
  });

  describe('Cross-database comparison', () => {
    test('should have similar table structures in both databases', async () => {
      const postgresDb = DatabaseService.fromUrl(postgresUrl);
      const mysqlDb = DatabaseService.fromUrl(mysqlUrl);

      const postgresSchema = await postgresDb.getAllSchemas();
      const mysqlSchema = await mysqlDb.getAllSchemas();

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
      const postgresDb = DatabaseService.fromUrl(postgresUrl);
      const mysqlDb = DatabaseService.fromUrl(mysqlUrl);

      const pgProducts = await postgresDb.getSampleData({
        table: 'products',
        schema: 'public',
      });

      const myProducts = await mysqlDb.getSampleData({
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
