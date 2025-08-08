export interface ColumnSchema {
  schema: string;
  table: string;
  name: string;
  ordinalPosition: number;
  dataType: string;
  udtName: string | null;
  maxLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
  isNullable: boolean;
  default: string | null;
  comment: string | null;
}

export interface PrimaryKey {
  name: string;
  columns: string[];
}

export interface ForeignKey {
  name: string;
  columns: string[];
  referencedSchema: string;
  referencedTable: string;
  referencedColumns: string[];
  onUpdate: string | null;
  onDelete: string | null;
}

export interface IndexSchema {
  name: string;
  isUnique: boolean;
  isPrimary: boolean;
  definition: string;
}

export interface TableSchema {
  schema: string;
  name: string;
  comment: string | null;
  columns: ColumnSchema[];
  primaryKey: PrimaryKey | null;
  foreignKeys: ForeignKey[];
  indexes: IndexSchema[];
}
