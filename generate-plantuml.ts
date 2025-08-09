#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';

interface Column {
  schema: string;
  table: string;
  name: string;
  ordinalPosition: number;
  dataType: string;
  udtName: string;
  maxLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
  isNullable: boolean;
  default: string | null;
  comment: string | null;
}

interface PrimaryKey {
  name: string;
  columns: string[];
}

interface ForeignKey {
  name: string;
  columns: string[];
  referencedSchema: string;
  referencedTable: string;
  referencedColumns: string[];
  onUpdate: string;
  onDelete: string;
}

interface Index {
  name: string;
  isUnique: boolean;
  isPrimary: boolean;
  definition: string;
}

interface Table {
  schema: string;
  name: string;
  comment: string | null;
  columns: Column[];
  primaryKey: PrimaryKey;
  foreignKeys: ForeignKey[];
  indexes: Index[];
}

// Read the schema file
const schemaPath = path.join(__dirname, 'schemas', 'postgres.json');
const schema: Table[] = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Helper function to map PostgreSQL types to simpler PlantUML types
function mapDataType(dataType: string): string {
  const typeMap: Record<string, string> = {
    text: 'STRING',
    'character varying': 'VARCHAR',
    integer: 'INT',
    bigint: 'BIGINT',
    boolean: 'BOOL',
    'timestamp without time zone': 'TIMESTAMP',
    'timestamp with time zone': 'TIMESTAMPTZ',
    jsonb: 'JSONB',
    json: 'JSON',
    ARRAY: 'ARRAY',
    'USER-DEFINED': 'ENUM',
    uuid: 'UUID',
    date: 'DATE',
    time: 'TIME',
    numeric: 'DECIMAL',
    real: 'FLOAT',
    'double precision': 'DOUBLE',
  };
  return typeMap[dataType] || dataType.toUpperCase();
}

// Regex for checking special characters in names
const SPECIAL_CHAR_REGEX = /[^a-zA-Z0-9_]/;

// Helper function to escape PlantUML special characters
function escapeName(name: string): string {
  // If name contains special characters, wrap in quotes
  if (SPECIAL_CHAR_REGEX.test(name)) {
    return `"${name}"`;
  }
  return name;
}

// Generate PlantUML ERD
let plantuml = '@startuml\n';
plantuml += 'title PostgreSQL Database Schema\n\n';
plantuml += 'skinparam linetype ortho\n';
plantuml += 'hide circle\n\n';

// Track processed junction tables to avoid duplicating many-to-many relationships
const processedJunctionTables = new Set<string>();

// Process each table
for (const table of schema) {
  // Skip internal tables
  if (table.name.startsWith('_prisma')) {
    continue;
  }

  // Check if this is a junction table (starts with _ and has exactly 2 foreign keys)
  const isJunctionTable =
    table.name.startsWith('_') && table.foreignKeys.length === 2;
  if (isJunctionTable) {
    processedJunctionTables.add(table.name);
    // Don't skip - we want to show junction tables in the ERD
  }

  // Add entity with schema name as stereotype
  const fullTableName =
    table.schema !== 'public' ? `${table.schema}.${table.name}` : table.name;

  // Add table comment if exists
  let entityDeclaration = `entity ${escapeName(fullTableName)} <<${table.schema}>>`;
  if (table.comment) {
    entityDeclaration += ` : ${table.comment}`;
  }
  plantuml += `${entityDeclaration} {\n`;

  // Add primary key columns first
  if (table.primaryKey) {
    for (const pkCol of table.primaryKey.columns) {
      const column = table.columns.find((col: Column) => col.name === pkCol);
      if (column) {
        let line = `  * **${column.name}** : ${mapDataType(column.dataType)} <<PK>>`;
        if (column.comment) {
          line += ` -- ${column.comment}`;
        }
        plantuml += `${line}\n`;
      }
    }
    plantuml += '  --\n';
  }

  // Add other columns
  for (const column of table.columns) {
    // Skip if already added as primary key
    if (table.primaryKey?.columns.includes(column.name)) {
      continue;
    }

    // Build column line
    const nullable = column.isNullable ? '  ' : '  * ';
    plantuml += `${nullable}${column.name} : ${mapDataType(column.dataType)}`;

    // Add constraints/notes
    const notes: string[] = [];

    // Check if it's a foreign key
    const fk = table.foreignKeys.find((foreignKey: ForeignKey) =>
      foreignKey.columns.includes(column.name)
    );
    if (fk) {
      notes.push('<<FK>>');
    }

    // Check if it's unique (but not a primary key)
    const uniqueIndex = table.indexes.find(
      (idx: Index) =>
        (idx.isUnique &&
          !idx.isPrimary &&
          idx.definition.includes(`(${column.name})`)) ||
        idx.definition.includes(`("${column.name}")`)
    );
    if (uniqueIndex) {
      notes.push('<<UNIQUE>>');
    }

    // Add default value if present
    if (
      column.default &&
      column.default !== 'CURRENT_TIMESTAMP' &&
      column.default !== 'now()'
    ) {
      notes.push(`DEFAULT: ${column.default}`);
    }

    if (notes.length > 0) {
      plantuml += ` ${notes.join(' ')}`;
    }

    // Add column comment if exists
    if (column.comment) {
      plantuml += ` -- ${column.comment}`;
    }

    plantuml += '\n';
  }

  plantuml += '}\n\n';
}

// Add relationships based on foreign keys
plantuml += "'Relationships\n";
for (const table of schema) {
  // Include all tables with foreign keys, including junction tables
  for (const fk of table.foreignKeys) {
    const sourceTable = table.name;
    const targetTable = fk.referencedTable;
    const sourceColumn = fk.columns[0];

    // Find the column to determine if it's nullable
    const column = table.columns.find(
      (col: Column) => col.name === sourceColumn
    );

    // Determine relationship notation
    // PlantUML notation: ||--o{ means "one to zero or many"
    // ||--|{ means "one to one or many" (required)
    let relationship: string;
    if (column?.isNullable) {
      const sourceFullName =
        table.schema !== 'public'
          ? `${table.schema}.${sourceTable}`
          : sourceTable;
      const targetFullName =
        fk.referencedSchema !== 'public'
          ? `${fk.referencedSchema}.${targetTable}`
          : targetTable;
      relationship = `${escapeName(targetFullName)} ||--o{ ${escapeName(sourceFullName)}`;
    } else {
      const sourceFullName =
        table.schema !== 'public'
          ? `${table.schema}.${sourceTable}`
          : sourceTable;
      const targetFullName =
        fk.referencedSchema !== 'public'
          ? `${fk.referencedSchema}.${targetTable}`
          : targetTable;
      relationship = `${escapeName(targetFullName)} ||--|{ ${escapeName(sourceFullName)}`;
    }

    plantuml += `${relationship} : ${fk.name.replace(/_/g, ' ')}\n`;
  }
}

// Note: Junction tables are now shown as entities with their foreign key relationships

plantuml += '\n@enduml';

// Write the PlantUML file
const outputPath = path.join(__dirname, 'database-schema.puml');
fs.writeFileSync(outputPath, plantuml);

// Also create a simplified version without all details
let simplifiedPlantuml = '@startuml\n';
simplifiedPlantuml += 'title PostgreSQL Database Schema (Simplified)\n\n';
simplifiedPlantuml += 'skinparam linetype ortho\n';
simplifiedPlantuml += 'hide circle\n\n';

// Add simplified entities (just table names and key fields)
for (const table of schema) {
  if (table.name.startsWith('_prisma')) {
    continue;
  }

  // Add entity with schema name
  const fullTableName =
    table.schema !== 'public' ? `${table.schema}.${table.name}` : table.name;
  simplifiedPlantuml += `entity ${escapeName(fullTableName)} <<${table.schema}>> {\n`;

  // Only show primary keys and foreign keys
  if (table.primaryKey) {
    for (const pkCol of table.primaryKey.columns) {
      simplifiedPlantuml += `  + ${pkCol} : PK\n`;
    }
  }

  // Show foreign key columns
  for (const fk of table.foreignKeys) {
    for (const col of fk.columns) {
      if (!table.primaryKey?.columns.includes(col)) {
        simplifiedPlantuml += `  # ${col} : FK\n`;
      }
    }
  }

  simplifiedPlantuml += '}\n\n';
}

// Add relationships
for (const table of schema) {
  // Include all foreign key relationships
  for (const fk of table.foreignKeys) {
    const sourceFullName =
      table.schema !== 'public' ? `${table.schema}.${table.name}` : table.name;
    const targetFullName =
      fk.referencedSchema !== 'public'
        ? `${fk.referencedSchema}.${fk.referencedTable}`
        : fk.referencedTable;
    simplifiedPlantuml += `${escapeName(targetFullName)} ||--o{ ${escapeName(sourceFullName)}\n`;
  }
}

simplifiedPlantuml += '\n@enduml';

const simplifiedOutputPath = path.join(
  __dirname,
  'database-schema-simplified.puml'
);
fs.writeFileSync(simplifiedOutputPath, simplifiedPlantuml);
