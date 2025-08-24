import type { TableSchema } from '../database/types';

export interface TableReference {
  schema: string;
  table: string;
}

export interface JoinRelation {
  from: {
    schema: string;
    table: string;
    columns: string[]; // Array for composite keys
  };
  to: {
    schema: string;
    table: string;
    columns: string[]; // Array for composite keys
  };
  isNullable: boolean; // If the FK columns are nullable
}

export interface JoinPath {
  tables: TableReference[]; // All tables in join path (input + intermediate)
  relations: JoinRelation[]; // Join relations between tables
  inputTablesCount: number; // Number of input tables
  totalTablesCount: number; // Total including intermediate
  totalJoins: number; // Number of joins needed
}

export interface DatabaseProvider {
  getAllTableNames(): Promise<Array<{ schema: string; table: string }>>;
  getSchema(params: { table: string; schema?: string }): Promise<TableSchema>;
  getAllSchemas(): Promise<TableSchema[]>;
  getSampleData(params: {
    table: string;
    schema?: string;
  }): Promise<Record<string, unknown>[]>;
  getTableJoins(params: { tables: TableReference[] }): Promise<{
    joinPath: JoinPath[];
    sql: string;
  } | null>;
}
