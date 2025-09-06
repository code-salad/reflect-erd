/**
 * Command option interfaces for all CLI commands
 */

export interface SchemaCommandOptions {
  db: string;
}

export interface TableCommandOptions {
  db: string;
  table: string;
  schema?: string;
  withSample?: boolean;
}

export interface ListCommandOptions {
  db: string;
  output?: 'simple' | 'json';
}

export interface SampleCommandOptions {
  db: string;
  table: string;
  schema?: string;
  limit?: number;
}

export interface ContextCommandOptions {
  db: string;
  table: string;
  schema?: string;
}

export interface JoinCommandOptions {
  db: string;
  tables: string;
  output?: 'json' | 'sql';
}

export interface SafeQueryCommandOptions {
  db: string;
  sql: string;
}

export interface InfoCommandOptions {
  db: string;
}

export interface PlantumlCommandOptions {
  db: string;
  simple?: boolean;
}
