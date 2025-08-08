import mysql, { type RowDataPacket } from 'mysql2/promise';
import { DatabaseServiceImpl } from './base';
import type {
  ColumnSchema,
  ForeignKey,
  IndexSchema,
  PrimaryKey,
  TableSchema,
} from './types';

// MySQL types
interface MySQLTableRow extends RowDataPacket {
  schema_name: string;
  table_name: string;
  table_comment: string | null;
}

interface MySQLColumnRow extends RowDataPacket {
  table_schema: string;
  table_name: string;
  ordinal_position: number;
  column_name: string;
  data_type: string;
  udt_name: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: boolean;
  column_default: string | null;
  column_comment: string | null;
}

interface MySQLPrimaryKeyRow extends RowDataPacket {
  constraint_name: string;
  columns: string | null;
}

interface MySQLForeignKeyRow extends RowDataPacket {
  constraint_name: string;
  columns: string | null;
  foreign_table_schema: string;
  foreign_table_name: string;
  foreign_columns: string | null;
  update_rule: string | null;
  delete_rule: string | null;
}

interface MySQLIndexRow extends RowDataPacket {
  index_name: string;
  is_unique: boolean;
  is_primary: boolean;
  index_def: string;
}

export class MySQLDatabaseService extends DatabaseServiceImpl {
  async pullSchema(): Promise<TableSchema[]> {
    const connection = await mysql.createConnection(this.databaseUrl);

    try {
      // Parse database name from URL
      const urlParts = new URL(this.databaseUrl);
      const dbName = urlParts.pathname.slice(1); // Remove leading /

      if (!dbName) {
        throw new Error('Database name not found in MySQL URL');
      }

      // 1) Get all tables
      const [tables] = await connection.execute<MySQLTableRow[]>(
        `
        SELECT 
          TABLE_SCHEMA as schema_name,
          TABLE_NAME as table_name,
          TABLE_COMMENT as table_comment
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `,
        [dbName]
      );

      const tablePromises = tables.map(async (t) => {
        const schema = t.schema_name;
        const table = t.table_name;

        // Run all queries in parallel for each table
        const [columnsResult, pkResult, fkResult, idxResult] =
          await Promise.all([
            // 2) Columns
            connection.execute<MySQLColumnRow[]>(
              `
            SELECT 
              TABLE_SCHEMA as table_schema,
              TABLE_NAME as table_name,
              ORDINAL_POSITION as ordinal_position,
              COLUMN_NAME as column_name,
              DATA_TYPE as data_type,
              COLUMN_TYPE as udt_name,
              CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
              NUMERIC_PRECISION as numeric_precision,
              NUMERIC_SCALE as numeric_scale,
              IF(IS_NULLABLE = 'YES', true, false) as is_nullable,
              COLUMN_DEFAULT as column_default,
              COLUMN_COMMENT as column_comment
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
          `,
              [schema, table]
            ),

            // 3) Primary key
            connection.execute<MySQLPrimaryKeyRow[]>(
              `
            SELECT 
              tc.CONSTRAINT_NAME as constraint_name,
              GROUP_CONCAT(kcu.COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) as columns
            FROM information_schema.TABLE_CONSTRAINTS tc
            JOIN information_schema.KEY_COLUMN_USAGE kcu
              ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
              AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
              AND tc.TABLE_NAME = kcu.TABLE_NAME
            WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
              AND tc.TABLE_SCHEMA = ?
              AND tc.TABLE_NAME = ?
            GROUP BY tc.CONSTRAINT_NAME
          `,
              [schema, table]
            ),

            // 4) Foreign keys
            connection.execute<MySQLForeignKeyRow[]>(
              `
            SELECT 
              tc.CONSTRAINT_NAME as constraint_name,
              GROUP_CONCAT(kcu.COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) as columns,
              kcu.REFERENCED_TABLE_SCHEMA as foreign_table_schema,
              kcu.REFERENCED_TABLE_NAME as foreign_table_name,
              GROUP_CONCAT(kcu.REFERENCED_COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) as foreign_columns,
              rc.UPDATE_RULE as update_rule,
              rc.DELETE_RULE as delete_rule
            FROM information_schema.TABLE_CONSTRAINTS tc
            JOIN information_schema.KEY_COLUMN_USAGE kcu
              ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
              AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
              AND tc.TABLE_NAME = kcu.TABLE_NAME
            JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
              ON rc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
              AND rc.CONSTRAINT_SCHEMA = tc.TABLE_SCHEMA
            WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
              AND tc.TABLE_SCHEMA = ?
              AND tc.TABLE_NAME = ?
            GROUP BY tc.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_SCHEMA, 
                     kcu.REFERENCED_TABLE_NAME, rc.UPDATE_RULE, rc.DELETE_RULE
          `,
              [schema, table]
            ),

            // 5) Indexes
            connection.execute<MySQLIndexRow[]>(
              `
            SELECT 
              INDEX_NAME as index_name,
              IF(NON_UNIQUE = 0, true, false) as is_unique,
              IF(INDEX_NAME = 'PRIMARY', true, false) as is_primary,
              CONCAT('INDEX ', INDEX_NAME, ' ON ', TABLE_NAME, 
                     ' (', GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX), ')') as index_def
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = ?
              AND TABLE_NAME = ?
            GROUP BY INDEX_NAME, NON_UNIQUE, TABLE_NAME
            ORDER BY INDEX_NAME
          `,
              [schema, table]
            ),
          ]);

        const [columns] = columnsResult;
        const [pkRows] = pkResult;
        const [fkRows] = fkResult;
        const [idxRows] = idxResult;

        const columnSchemas: ColumnSchema[] = columns.map((r) => ({
          schema: r.table_schema,
          table: r.table_name,
          name: r.column_name,
          ordinalPosition: Number(r.ordinal_position),
          dataType: r.data_type,
          udtName: r.udt_name ?? null,
          maxLength: r.character_maximum_length ?? null,
          numericPrecision: r.numeric_precision ?? null,
          numericScale: r.numeric_scale ?? null,
          isNullable: !!r.is_nullable,
          default: r.column_default ?? null,
          comment: r.column_comment ?? null,
        }));

        const primaryKey: PrimaryKey | null =
          pkRows.length > 0 && pkRows[0]
            ? {
                name: pkRows[0].constraint_name,
                columns: pkRows[0].columns ? pkRows[0].columns.split(',') : [],
              }
            : null;

        const foreignKeys: ForeignKey[] = fkRows.map((r) => ({
          name: r.constraint_name,
          columns: r.columns ? r.columns.split(',') : [],
          referencedSchema: r.foreign_table_schema,
          referencedTable: r.foreign_table_name,
          referencedColumns: r.foreign_columns
            ? r.foreign_columns.split(',')
            : [],
          onUpdate: r.update_rule ?? null,
          onDelete: r.delete_rule ?? null,
        }));

        const indexes: IndexSchema[] = idxRows.map((r) => ({
          name: r.index_name,
          isUnique: !!r.is_unique,
          isPrimary: !!r.is_primary,
          definition: r.index_def,
        }));

        return {
          schema,
          name: table,
          comment: t.table_comment || null,
          columns: columnSchemas,
          primaryKey,
          foreignKeys,
          indexes,
        };
      });

      return Promise.all(tablePromises);
    } finally {
      await connection.end();
    }
  }
}
