# vsequel

[![npm version](https://badge.fury.io/js/vsequel.svg)](https://www.npmjs.com/package/vsequel)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

A CLI tool and TypeScript library for extracting database schemas and generating ERD diagrams from PostgreSQL and MySQL databases.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [CLI Usage](#cli-usage)
  - [Subcommands](#subcommands)
  - [Examples](#examples)
- [Library Usage](#library-usage)
- [API Reference](#api-reference)
- [Development](#development)
- [Changelog](#changelog)

## Features

- 🗄️ **Multi-Database Support** - Works with PostgreSQL, MySQL, and MariaDB
- 📊 **ERD Generation** - Create PlantUML diagrams from your database schema
- 🔍 **Schema Extraction** - Export complete database schemas as JSON
- 🔗 **Join Path Finding** - Automatically find the shortest path to join multiple tables
- 📝 **Sample Data** - Retrieve sample data from tables for documentation
- 🚀 **Performance** - Parallel operations for fetching schema and data
- 📦 **TypeScript First** - Full TypeScript support with detailed type definitions
- 🎯 **CLI & Library** - Use as a command-line tool or import as a library

## Quick Start

```bash
# Generate an ERD diagram
npx vsequel schema --db postgresql://localhost/mydb > erd.puml

# List all tables
npx vsequel list --db postgresql://localhost/mydb

# Find how to join tables
npx vsequel join --db postgresql://localhost/mydb --tables orders,customers,products

# Get table details with sample data
npx vsequel context --db postgresql://localhost/mydb --table users
```

## Installation

### CLI Usage (Recommended)

You can use this tool directly without installation:

```bash
# Using npx (recommended)
npx vsequel schema --db <database-url>
```

Or install it globally:

```bash
# Using bun
npm add -g vsequel

# Using npm
npm install -g vsequel

# Using yarn
yarn global add vsequel

# Using pnpm
pnpm add -g vsequel
```

### Library Usage

```bash
# Using bun
npm add vsequel

# Using npm
npm install vsequel

# Using yarn
yarn add vsequel

# Using pnpm
pnpm add vsequel
```

## CLI Usage

### Subcommands

The CLI provides multiple subcommands for different operations:

```bash
vsequel [subcommand] --db <database-url> [options]
```

Available subcommands:

- `schema` - Extract full database schema (default)
- `table` - Get schema for a specific table
- `list` - List all table names
- `sample` - Get sample data from a table
- `context` - Get schema and sample data for a table
- `join` - Find shortest join path between tables
- `info` - Show database connection info

### Schema Command (Default)

Extract the complete database schema:

```bash
# Default output (full PlantUML)
vsequel schema --db postgresql://localhost/mydb

# Or explicitly use schema subcommand
vsequel schema --db postgresql://localhost/mydb

# Output as JSON
vsequel schema --db postgresql://localhost/mydb --output json

# Simple PlantUML (relationships only)
vsequel schema --db postgresql://localhost/mydb --output plantuml
```

### Table Command

Get schema for a specific table:

```bash
# Get table schema as JSON
vsequel table --db postgresql://localhost/mydb --table users

# Include sample data
vsequel table --db postgresql://localhost/mydb --table users --with-sample

# Output as PlantUML
vsequel table --db postgresql://localhost/mydb --table users --output plantuml
```

### List Command

List all tables in the database:

```bash
# Simple list (one per line)
vsequel list --db postgresql://localhost/mydb

# JSON array
vsequel list --db postgresql://localhost/mydb --output json
```

### Sample Command

Get sample data from a table:

```bash
vsequel sample --db postgresql://localhost/mydb --table users
vsequel sample --db mysql://localhost/mydb --table orders --schema myschema
```

### Context Command

Get both schema and sample data for a table:

```bash
vsequel context --db postgresql://localhost/mydb --table users
```

### Join Command

Find the shortest path to join multiple tables and generate complete SQL queries:

````bash
# Generate complete SQL query with all columns
vsequel join --db postgresql://localhost/mydb --tables orders,customers --output sql

# Output:
# SELECT
#   "public"."orders"."id",
#   "public"."orders"."customer_id",
#   "public"."orders"."order_date",
#   "public"."customers"."id",
#   "public"."customers"."name",
#   "public"."customers"."email"
# FROM "public"."orders"
# JOIN "public"."customers" ON "public"."orders"."customer_id" = "public"."customers"."id"

# Get detailed path information as JSON
vsequel join --db postgresql://localhost/mydb --tables orders,customers,products --output json

# Using schema-qualified table names
vsequel join --db postgresql://localhost/mydb --tables public.orders,public.customers

### Info Command

Get database connection information:

```bash
vsequel info --db postgresql://localhost/mydb
````

### Global Options

- `-d, --db <url>` - Database connection URL (required)
  - PostgreSQL: `postgresql://user:pass@host:port/db`
  - MySQL: `mysql://user:pass@host:port/db`
- `-h, --help` - Show help for any command

### Command-Specific Options

#### Schema Options

- `-o, --output <type>` - Output format: `json`, `plantuml`, `full-plantuml` (default)

#### Table Options

- `-t, --table <name>` - Table name (required)
- `-s, --schema <name>` - Schema name (optional)
- `--with-sample` - Include sample data
- `-o, --output <type>` - Output format: `json` (default), `plantuml`

#### Join Options

- `--tables <list>` - Comma-separated list of tables (required)
- `--output <type>` - Output format: `sql` (default - generates complete SELECT query), `json` (returns join path details)

#### Sample Options

- `--table <name>` - Table name (required)
- `--schema <name>` - Schema name (optional)
- `--limit <number>` - Maximum number of rows to return (default: 10)

#### Context Options

- `--table <name>` - Table name (required)
- `--schema <name>` - Schema name (optional)

### Examples

#### Generate complete ERD diagram

```bash
npx vsequel schema --db postgresql://localhost/mydb > diagram.puml
plantuml diagram.puml  # Generate PNG/SVG
```

#### Explore database structure

```bash
# List all tables
npx vsequel list --db postgresql://localhost/mydb

# Get details for specific table
npx vsequel table --db postgresql://localhost/mydb --table users

# Get sample data
npx vsequel sample --db postgresql://localhost/mydb --table users
```

#### Generate SQL joins for reporting

```bash
# Generate complete SQL query
npx vsequel join --db postgresql://localhost/mydb \
  --tables orders,customers,products --output sql > query.sql

# The generated query includes:
# - SELECT with all columns from all tables
# - Proper JOIN clauses based on foreign keys
# - Database-specific syntax (PostgreSQL or MySQL)

# Use the generated SQL directly
psql mydb < query.sql

# Or copy to clipboard (macOS)
npx vsequel join --db postgresql://localhost/mydb \
  --tables orders,customers --output sql | pbcopy
```

#### Pipeline operations

```bash
# List tables and get schema for each
npx vsequel list --db $DB_URL | \
  xargs -I {} npx vsequel table --db $DB_URL --table {}
```

## Library Usage

```typescript
import { DatabaseService, generatePlantumlSchema } from "vsequel";
import type { JoinPath, TableReference } from "vsequel";

// Initialize from database URL
const db = DatabaseService.fromUrl(
  "postgresql://user:password@localhost:5432/mydb"
);

// Pull all schemas
const schemas = await db.getAllSchemas();

// Pull schema for a specific table
const tableSchema = await db.getSchema({
  table: "users",
  schema: "public", // optional
});

// Pull sample data from a specific table
const sampleData = await db.getSampleData({
  table: "users",
  schema: "public", // optional
});

// Get table context (schema + sample data in parallel)
const context = await db.getTableContext({
  table: "users",
  schema: "public",
});
console.log(context.schema); // Table schema
console.log(context.sampleData); // Sample rows

// Find shortest join path and generate SQL
const result = await db.getTableJoins({
  tables: [
    { schema: "public", table: "orders" },
    { schema: "public", table: "customers" },
    { schema: "public", table: "products" },
  ],
});

if (result) {
  // Get the generated SQL query
  console.log(result.sql);
  // Output: Complete SELECT statement with all columns and JOIN clauses

  // Access the join path details
  const joinPath = result.joinPath[0];
  console.log(`Connected ${joinPath.inputTablesCount} tables`);
  console.log(`Total tables in path: ${joinPath.totalTablesCount}`);
  console.log(`Joins needed: ${joinPath.totalJoins}`);

  // Use relations for custom SQL building if needed
  joinPath.relations.forEach((rel) => {
    console.log(
      `JOIN ${rel.to.table} ON ${rel.from.table}.${rel.from.columns[0]} = ${rel.to.table}.${rel.to.columns[0]}`
    );
  });
}

// Generate PlantUML diagrams
const diagrams = db.generatePlantumlSchema({ schema: schemas });
console.log(diagrams.full); // Full detailed PlantUML
console.log(diagrams.simplified); // Simplified PlantUML
```

## Output Formats

### Schema (JSON)

Returns a detailed JSON structure containing:

- Table names and schemas
- Column definitions with types, constraints, and defaults
- Foreign key relationships
- Indexes and constraints

### PlantUML Output

Two PlantUML formats are available:

#### Simple PlantUML (`--output plantuml`)

- Tables with relationships only
- Minimal detail for overview diagrams

#### Full PlantUML (`--output full-plantuml`, default)

- All tables with their columns
- Data types and constraints
- Primary and foreign keys
- Relationships between tables
- Column nullability and defaults

## Requirements

- Node.js 18+ or npm 1.0+
- Database access (read-only is sufficient)

## Supported Databases

- PostgreSQL (9.5+)
- MySQL (5.7+)

### Connection URL Format

```bash
# PostgreSQL
postgresql://username:password@hostname:5432/database
postgres://username:password@hostname:5432/database

# MySQL
mysql://username:password@hostname:3306/database
mysql2://username:password@hostname:3306/database
```

## API Reference

### `DatabaseService`

#### `fromUrl(databaseUrl: string): DatabaseService`

Static method to create a DatabaseService instance from a database URL.

#### `getAllTableNames(): Promise<Array<{ schema: string; table: string }>>`

Retrieves all table names and their schemas from the database.

#### `getAllSchemas(): Promise<TableSchema[]>`

Retrieves the complete database schema including all tables, columns, indexes, and foreign keys.

#### `getSchema(params: { table: string; schema?: string }): Promise<TableSchema>`

Retrieves the schema for a specific table.

#### `getSampleData(params: { table: string; schema?: string }): Promise<Record<string, unknown>[]>`

Retrieves sample data from a specific table (maximum 10 rows).

#### `getTableContext(params: { table: string; schema?: string }): Promise<{ schema: TableSchema; sampleData: Record<string, unknown>[] }>`

Retrieves both schema and sample data for a table in parallel for better performance.

#### `getTableJoins(params: { tables: TableReference[] }): Promise<{ joinPath: JoinPath[]; sql: string } | null>`

Finds the shortest path to join multiple tables and generates a complete SQL query. Returns:

- `sql`: Complete SELECT statement with all columns explicitly listed and proper JOIN clauses
- `joinPath`: Array containing the join path details with:
  - `tables`: All tables in the join path (input + intermediate)
  - `relations`: Join relations with column mappings
  - `inputTablesCount`: Number of input tables
  - `totalTablesCount`: Total tables including intermediates
  - `totalJoins`: Number of joins needed

The generated SQL:

- Lists all columns explicitly from all joined tables
- Uses simple `JOIN` keyword for all joins
- Properly quotes identifiers (double quotes for PostgreSQL, backticks for MySQL)
- Includes fully qualified table names with schema prefixes

Returns `null` if tables cannot be connected.

#### `generatePlantumlSchema(params: { schema: TableSchema[] }): { full: string; simplified: string }`

Generates PlantUML ERD diagrams from the database schema. Returns both a full detailed version and a simplified version.

#### `getProvider(): 'postgres' | 'mysql'`

Returns the database provider type being used.

### Type Definitions

#### `TableReference`

```typescript
interface TableReference {
  schema: string;
  table: string;
}
```

#### `JoinPath`

```typescript
interface JoinPath {
  tables: TableReference[]; // All tables in join path
  relations: JoinRelation[]; // Join relations between tables
  inputTablesCount: number; // Number of input tables
  totalTablesCount: number; // Total including intermediate tables
  totalJoins: number; // Number of joins needed
}
```

#### `JoinRelation`

```typescript
interface JoinRelation {
  from: {
    schema: string;
    table: string;
    columns: string[]; // Foreign key columns
  };
  to: {
    schema: string;
    table: string;
    columns: string[]; // Referenced columns
  };
  isNullable: boolean; // If the FK columns are nullable
}
```

#### `TableSchema`

```typescript
interface TableSchema {
  schema: string;
  name: string;
  comment: string | null;
  columns: ColumnSchema[];
  primaryKey: PrimaryKey | null;
  foreignKeys: ForeignKey[];
  indexes: IndexSchema[];
}
```

## Development

### Setup

```bash
npm install
```

### Testing

```bash
# Run tests with Docker databases
npm run test:ee

# Run all tests
npm test

# Watch mode
npm test --watch
```

### Local Development

```bash
# Link package locally
npm link

# Test CLI
npx vsequel --help
```

### Code Quality

```bash
# Run linting
npm run lint

# Run formatting
npm run format
```

## Changelog

### Version 0.1.2

- **Complete SQL Generation**: Generate ready-to-use SELECT queries with all columns and proper JOINs
- **Join Path Finding**: Automatically discover how to join multiple tables
- **Database-Specific Syntax**: Proper identifier quoting for PostgreSQL and MySQL
- **Explicit Column Selection**: All columns from joined tables are explicitly listed
- **Command-based CLI**: Modular CLI with specialized commands for different tasks
- **Better Performance**: Parallel data fetching with `getTableContext`
- **Sample Data Limits**: Control the number of sample rows returned
- **TypeScript Support**: Full TypeScript types for all exports

## License

MIT
