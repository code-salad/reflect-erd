import { strict as assert } from 'node:assert/strict';
import { describe, test } from 'node:test';
import type {
  ColumnSchema,
  ForeignKey,
  IndexSchema,
  PrimaryKey,
  TableSchema,
} from '../database/types';
import { generatePlantumlSchema } from './generator';

// Top-level regex patterns for performance
const STARTUML_PATTERN = /@startuml/;
const ENDUML_PATTERN = /@enduml/;

const createMockColumn = (
  overrides: Partial<ColumnSchema> = {}
): ColumnSchema => ({
  schema: 'public',
  table: 'test_table',
  name: 'id',
  ordinalPosition: 1,
  dataType: 'integer',
  udtName: null,
  maxLength: null,
  numericPrecision: null,
  numericScale: null,
  isNullable: false,
  default: null,
  comment: null,
  ...overrides,
});

const createMockPrimaryKey = (
  overrides: Partial<PrimaryKey> = {}
): PrimaryKey => ({
  name: 'pk_test',
  columns: ['id'],
  ...overrides,
});

const createMockForeignKey = (
  overrides: Partial<ForeignKey> = {}
): ForeignKey => ({
  name: 'fk_test',
  columns: ['user_id'],
  referencedSchema: 'public',
  referencedTable: 'users',
  referencedColumns: ['id'],
  onUpdate: null,
  onDelete: null,
  ...overrides,
});

const createMockIndex = (
  overrides: Partial<IndexSchema> = {}
): IndexSchema => ({
  name: 'idx_test',
  isUnique: false,
  isPrimary: false,
  definition: 'CREATE INDEX idx_test ON test_table (name)',
  ...overrides,
});

const createMockTable = (
  overrides: Partial<TableSchema> = {}
): TableSchema => ({
  schema: 'public',
  name: 'test_table',
  comment: null,
  columns: [createMockColumn()],
  primaryKey: createMockPrimaryKey(),
  foreignKeys: [],
  indexes: [],
  ...overrides,
});

describe('PlantUML Generator', () => {
  describe('generatePlantumlSchema', () => {
    test('should generate both full and simplified diagrams', () => {
      const schema = [createMockTable()];
      const result = generatePlantumlSchema({ schema });

      assert.ok(result.full);
      assert.ok(result.simplified);
      assert.strictEqual(typeof result.full, 'string');
      assert.strictEqual(typeof result.simplified, 'string');
    });

    test('should include PlantUML start and end tags', () => {
      const schema = [createMockTable()];
      const result = generatePlantumlSchema({ schema });

      assert.match(result.full, STARTUML_PATTERN);
      assert.match(result.full, ENDUML_PATTERN);
      assert.match(result.simplified, STARTUML_PATTERN);
      assert.match(result.simplified, ENDUML_PATTERN);
    });

    test('should handle empty schema', () => {
      const result = generatePlantumlSchema({ schema: [] });

      assert.match(result.full, STARTUML_PATTERN);
      assert.match(result.full, ENDUML_PATTERN);
      assert.match(result.simplified, STARTUML_PATTERN);
      assert.match(result.simplified, ENDUML_PATTERN);
    });

    test('should filter out Prisma tables', () => {
      const schema = [
        createMockTable({ name: '_prisma_migrations' }),
        createMockTable({ name: 'users' }),
      ];
      const result = generatePlantumlSchema({ schema });

      assert.ok(!result.full.includes('_prisma_migrations'));
      assert.ok(result.full.includes('users'));
      assert.ok(!result.simplified.includes('_prisma_migrations'));
      assert.ok(result.simplified.includes('users'));
    });
  });

  describe('Full diagram generation', () => {
    test('should generate entity with primary key', () => {
      const table = createMockTable({
        name: 'users',
        primaryKey: createMockPrimaryKey({ columns: ['id'] }),
        columns: [createMockColumn({ name: 'id', dataType: 'integer' })],
      });
      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('entity users'));
      assert.ok(result.full.includes('**id** : INT <<PK>>'));
    });

    test('should handle table with schema other than public', () => {
      const table = createMockTable({
        schema: 'auth',
        name: 'users',
      });
      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('entity "auth.users" <<auth>>'));
    });

    test('should escape special characters in table names', () => {
      const table = createMockTable({
        name: 'user-profile',
      });
      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('"user-profile"'));
    });

    test('should include table comments', () => {
      const table = createMockTable({
        name: 'users',
        comment: 'User information table',
      });
      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes(': User information table'));
    });

    test('should handle columns with different data types', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'id', dataType: 'integer' }),
          createMockColumn({ name: 'email', dataType: 'character varying' }),
          createMockColumn({
            name: 'created_at',
            dataType: 'timestamp without time zone',
          }),
          createMockColumn({ name: 'is_active', dataType: 'boolean' }),
          createMockColumn({ name: 'data', dataType: 'jsonb' }),
        ],
      });
      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('**id** : INT <<PK>>'));
      assert.ok(result.full.includes('email : VARCHAR'));
      assert.ok(result.full.includes('created_at : TIMESTAMP'));
      assert.ok(result.full.includes('is_active : BOOL'));
      assert.ok(result.full.includes('data : JSONB'));
    });

    test('should mark nullable columns correctly', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'required_field', isNullable: false }),
          createMockColumn({ name: 'optional_field', isNullable: true }),
        ],
        primaryKey: null,
      });
      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('  * required_field : INT'));
      assert.ok(result.full.includes('  optional_field : INT'));
    });

    test('should include column comments', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({
            name: 'email',
            comment: 'User email address',
            dataType: 'character varying',
          }),
        ],
        primaryKey: null,
      });
      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('-- User email address'));
    });

    test('should mark foreign key columns', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'id', dataType: 'integer' }),
          createMockColumn({ name: 'user_id', dataType: 'integer' }),
        ],
        foreignKeys: [createMockForeignKey({ columns: ['user_id'] })],
        primaryKey: createMockPrimaryKey({ columns: ['id'] }),
      });
      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('user_id : INT <<FK>>'));
    });

    test('should mark unique index columns', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'email', dataType: 'character varying' }),
        ],
        indexes: [
          createMockIndex({
            name: 'unique_email',
            isUnique: true,
            isPrimary: false,
            definition:
              'CREATE UNIQUE INDEX unique_email ON test_table (email)',
          }),
        ],
        primaryKey: null,
      });
      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('email : VARCHAR <<UNIQUE>>'));
    });

    test('should include default values for columns', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({
            name: 'status',
            dataType: 'character varying',
            default: "'active'",
          }),
        ],
        primaryKey: null,
      });
      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes("DEFAULT: 'active'"));
    });

    test('should exclude CURRENT_TIMESTAMP and now() defaults', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({
            name: 'created_at',
            dataType: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          }),
          createMockColumn({
            name: 'updated_at',
            dataType: 'timestamp',
            default: 'now()',
          }),
        ],
        primaryKey: null,
      });
      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(!result.full.includes('DEFAULT: CURRENT_TIMESTAMP'));
      assert.ok(!result.full.includes('DEFAULT: now()'));
    });

    test('should generate relationships between tables', () => {
      const usersTable = createMockTable({
        name: 'users',
        columns: [createMockColumn({ name: 'id' })],
      });

      const postsTable = createMockTable({
        name: 'posts',
        columns: [
          createMockColumn({ name: 'id' }),
          createMockColumn({ name: 'user_id', isNullable: false }),
        ],
        foreignKeys: [
          createMockForeignKey({
            name: 'fk_posts_user_id',
            columns: ['user_id'],
            referencedTable: 'users',
          }),
        ],
      });

      const result = generatePlantumlSchema({
        schema: [usersTable, postsTable],
      });

      assert.ok(result.full.includes('users ||--|{ posts : fk posts user id'));
    });

    test('should handle nullable foreign key relationships', () => {
      const usersTable = createMockTable({
        name: 'users',
        columns: [createMockColumn({ name: 'id' })],
      });

      const postsTable = createMockTable({
        name: 'posts',
        columns: [
          createMockColumn({ name: 'id' }),
          createMockColumn({ name: 'user_id', isNullable: true }),
        ],
        foreignKeys: [
          createMockForeignKey({
            columns: ['user_id'],
            referencedTable: 'users',
          }),
        ],
      });

      const result = generatePlantumlSchema({
        schema: [usersTable, postsTable],
      });

      assert.ok(result.full.includes('users ||--o{ posts'));
    });

    test('should handle cross-schema relationships', () => {
      const authTable = createMockTable({
        schema: 'auth',
        name: 'users',
        columns: [createMockColumn({ name: 'id' })],
      });

      const publicTable = createMockTable({
        schema: 'public',
        name: 'posts',
        columns: [
          createMockColumn({ name: 'id' }),
          createMockColumn({ name: 'user_id' }),
        ],
        foreignKeys: [
          createMockForeignKey({
            columns: ['user_id'],
            referencedSchema: 'auth',
            referencedTable: 'users',
          }),
        ],
      });

      const result = generatePlantumlSchema({
        schema: [authTable, publicTable],
      });

      assert.ok(result.full.includes('"auth.users" ||--|{ posts'));
    });
  });

  describe('Simplified diagram generation', () => {
    test('should generate simplified entities with only PK and FK', () => {
      const table = createMockTable({
        name: 'posts',
        columns: [
          createMockColumn({ name: 'id', dataType: 'integer' }),
          createMockColumn({ name: 'user_id', dataType: 'integer' }),
          createMockColumn({ name: 'title', dataType: 'character varying' }),
        ],
        primaryKey: createMockPrimaryKey({ columns: ['id'] }),
        foreignKeys: [createMockForeignKey({ columns: ['user_id'] })],
      });

      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.simplified.includes('+ id : PK'));
      assert.ok(result.simplified.includes('# user_id : FK'));
      assert.ok(!result.simplified.includes('title :'));
    });

    test('should not duplicate PK columns in FK section', () => {
      const table = createMockTable({
        columns: [createMockColumn({ name: 'id', dataType: 'integer' })],
        primaryKey: createMockPrimaryKey({ columns: ['id'] }),
        foreignKeys: [createMockForeignKey({ columns: ['id'] })],
      });

      const result = generatePlantumlSchema({ schema: [table] });
      const idMatches = result.simplified.match(/id/g);

      assert.strictEqual(idMatches?.length, 2);
      assert.ok(result.simplified.includes('+ id : PK'));
      assert.ok(!result.simplified.includes('# id : FK'));
    });

    test('should generate simplified relationships', () => {
      const usersTable = createMockTable({
        name: 'users',
        columns: [createMockColumn({ name: 'id' })],
      });

      const postsTable = createMockTable({
        name: 'posts',
        columns: [
          createMockColumn({ name: 'id' }),
          createMockColumn({ name: 'user_id' }),
        ],
        foreignKeys: [
          createMockForeignKey({
            columns: ['user_id'],
            referencedTable: 'users',
          }),
        ],
      });

      const result = generatePlantumlSchema({
        schema: [usersTable, postsTable],
      });

      assert.ok(result.simplified.includes('users ||--o{ posts'));
    });
  });

  describe('Data type mapping', () => {
    test('should map PostgreSQL types correctly', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'text_col', dataType: 'text' }),
          createMockColumn({
            name: 'varchar_col',
            dataType: 'character varying',
          }),
          createMockColumn({ name: 'int_col', dataType: 'integer' }),
          createMockColumn({ name: 'bigint_col', dataType: 'bigint' }),
          createMockColumn({ name: 'bool_col', dataType: 'boolean' }),
          createMockColumn({ name: 'json_col', dataType: 'jsonb' }),
          createMockColumn({ name: 'uuid_col', dataType: 'uuid' }),
          createMockColumn({
            name: 'timestamp_col',
            dataType: 'timestamp without time zone',
          }),
        ],
        primaryKey: null,
      });

      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('text_col : STRING'));
      assert.ok(result.full.includes('varchar_col : VARCHAR'));
      assert.ok(result.full.includes('int_col : INT'));
      assert.ok(result.full.includes('bigint_col : BIGINT'));
      assert.ok(result.full.includes('bool_col : BOOL'));
      assert.ok(result.full.includes('json_col : JSONB'));
      assert.ok(result.full.includes('uuid_col : UUID'));
      assert.ok(result.full.includes('timestamp_col : TIMESTAMP'));
    });

    test('should map MySQL types correctly', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'varchar_col', dataType: 'varchar' }),
          createMockColumn({ name: 'int_col', dataType: 'int' }),
          createMockColumn({ name: 'datetime_col', dataType: 'datetime' }),
          createMockColumn({ name: 'tinyint_col', dataType: 'tinyint' }),
          createMockColumn({ name: 'mediumtext_col', dataType: 'mediumtext' }),
          createMockColumn({ name: 'blob_col', dataType: 'mediumblob' }),
        ],
        primaryKey: null,
      });

      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('varchar_col : VARCHAR'));
      assert.ok(result.full.includes('int_col : INT'));
      assert.ok(result.full.includes('datetime_col : DATETIME'));
      assert.ok(result.full.includes('tinyint_col : TINYINT'));
      assert.ok(result.full.includes('mediumtext_col : TEXT'));
      assert.ok(result.full.includes('blob_col : BLOB'));
    });

    test('should handle unknown data types', () => {
      const table = createMockTable({
        columns: [
          createMockColumn({ name: 'custom_col', dataType: 'custom_type' }),
        ],
        primaryKey: null,
      });

      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('custom_col : CUSTOM_TYPE'));
    });
  });

  describe('Special character handling', () => {
    test('should escape table names with special characters', () => {
      const table = createMockTable({
        name: 'user-profiles',
      });

      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('"user-profiles"'));
      assert.ok(result.simplified.includes('"user-profiles"'));
    });

    test('should not escape normal table names', () => {
      const table = createMockTable({
        name: 'user_profiles',
      });

      const result = generatePlantumlSchema({ schema: [table] });

      assert.ok(result.full.includes('entity user_profiles'));
      assert.ok(!result.full.includes('"user_profiles"'));
    });
  });
});
