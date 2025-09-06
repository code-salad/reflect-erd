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
- 🔗 **Join Path Finding** - Find all possible paths to join multiple tables, sorted by efficiency
- 🛡️ **Safe Query Execution** - Test SQL queries safely with automatic rollback
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

# Find all ways to join tables
npx vsequel join --db postgresql://localhost/mydb --tables orders,customers,products

# Execute SQL queries safely (automatically rolled back)
npx vsequel safe-query --db postgresql://localhost/mydb --sql "SELECT * FROM users LIMIT 10"

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
- `safe-query` - Execute SQL queries safely in read-only transactions
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

Find all possible paths to join multiple tables and generate complete SQL queries:

````bash
# Generate complete SQL query for shortest path
vsequel join --db postgresql://localhost/mydb --tables orders,customers --output sql

# Output: (shortest path SQL)
# SELECT
#   "public"."orders"."id",
#   "public"."orders"."customer_id",
#   "public"."orders"."order_date",
#   "public"."customers"."id",
#   "public"."customers"."name",
#   "public"."customers"."email"
# FROM "public"."orders"
# JOIN "public"."customers" ON "public"."orders"."customer_id" = "public"."customers"."id"

# Get all possible join paths as JSON
vsequel join --db postgresql://localhost/mydb --tables orders,customers,products --output json

# Output: Array of all possible join paths, sorted by efficiency
# [
#   {
#     "tables": [...],
#     "relations": [...],
#     "totalJoins": 2,
#     ...
#   },
#   {
#     "tables": [...],
#     "relations": [...], 
#     "totalJoins": 3,
#     ...
#   }
# ]

# Using schema-qualified table names
vsequel join --db postgresql://localhost/mydb --tables public.orders,public.customers

### Safe-Query Command

Execute SQL queries safely in read-only transactions that automatically rollback:

```bash
# Execute a SELECT query (results returned as JSON)
vsequel safe-query --db postgresql://localhost/mydb --sql "SELECT * FROM users LIMIT 5"

# Test INSERT statements without modifying data
vsequel safe-query --db postgresql://localhost/mydb --sql "INSERT INTO users (name, email) VALUES ('Test', 'test@example.com')"

# Test UPDATE statements safely
vsequel safe-query --db mysql://localhost/mydb --sql "UPDATE products SET price = price * 1.1 WHERE category = 'electronics'"

# Test complex queries with joins
vsequel safe-query --db postgresql://localhost/mydb --sql "
  SELECT u.name, COUNT(o.id) as order_count 
  FROM users u 
  LEFT JOIN orders o ON u.id = o.user_id 
  GROUP BY u.id, u.name
"
```

**Key Features:**
- **Zero Risk**: All operations are automatically rolled back - no data is permanently modified
- **Full SQL Support**: Execute any SQL statement including INSERT, UPDATE, DELETE
- **JSON Output**: Results returned as structured JSON for easy parsing
- **Error Handling**: Gracefully handles SQL syntax errors and database issues
- **Cross-Database**: Works identically with both PostgreSQL and MySQL

Perfect for:
- Testing queries before running them in production
- Exploring data without risk of modification
- Learning SQL without fear of breaking anything
- Validating complex queries and their results

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

#### Safe-Query Options

- `--sql <query>` - SQL query to execute (required)
- `--db <url>` - Database connection URL (required)

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
# Generate shortest path SQL query
npx vsequel join --db postgresql://localhost/mydb \
  --tables orders,customers,products --output sql > query.sql

# The generated query includes:
# - SELECT with all columns from all tables
# - Optimal JOIN clauses based on shortest path
# - Database-specific syntax (PostgreSQL or MySQL)

# Use the generated SQL directly
psql mydb < query.sql

# Get all possible paths for analysis
npx vsequel join --db postgresql://localhost/mydb \
  --tables orders,customers,products --output json > join-paths.json

# Or copy shortest path SQL to clipboard (macOS)
npx vsequel join --db postgresql://localhost/mydb \
  --tables orders,customers --output sql | pbcopy
```

#### Safe query testing

```bash
# Test a complex query safely before running in production
npx vsequel safe-query --db $DB_URL \
  --sql "SELECT users.*, COUNT(orders.id) as order_count FROM users LEFT JOIN orders ON users.id = orders.user_id GROUP BY users.id"

# Safely test data modifications (automatically rolled back)
npx vsequel safe-query --db $DB_URL \
  --sql "UPDATE products SET price = price * 1.1 WHERE category = 'electronics'"

# Validate INSERT statements without actually inserting
npx vsequel safe-query --db $DB_URL \
  --sql "INSERT INTO users (name, email) VALUES ('Test User', 'test@example.com')"

# Test delete operations safely
npx vsequel safe-query --db $DB_URL \
  --sql "DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '30 days'"
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

// Execute SQL queries safely (automatically rolled back)
const selectResult = await db.safeQuery({
  sql: "SELECT * FROM users WHERE age > 18 LIMIT 10"
});
console.log(selectResult); // Array of user records

// Test INSERT/UPDATE/DELETE without modifying data
const insertResult = await db.safeQuery({
  sql: "INSERT INTO users (name, email) VALUES ('Test User', 'test@example.com')"
});
console.log(insertResult); // Empty array for MySQL, or inserted record for PostgreSQL

const updateResult = await db.safeQuery({
  sql: "UPDATE products SET price = price * 1.1 WHERE category = 'electronics'"
});
// All changes are automatically rolled back - no permanent modifications

// Find all possible join paths and generate SQL
const results = await db.getTableJoins({
  tables: [
    { schema: "public", table: "orders" },
    { schema: "public", table: "customers" },
    { schema: "public", table: "products" },
  ],
});

if (results && results.length > 0) {
  console.log(`Found ${results.length} possible join path(s)`);
  
  // Get the shortest path (first result)
  const shortestResult = results[0];
  console.log("Shortest path SQL:");
  console.log(shortestResult.sql);
  // Output: Complete SELECT statement with all columns and JOIN clauses

  // Access the join path details
  const joinPath = shortestResult.joinPath;
  console.log(`Connected ${joinPath.inputTablesCount} tables`);
  console.log(`Total tables in path: ${joinPath.totalTablesCount}`);
  console.log(`Joins needed: ${joinPath.totalJoins}`);

  // Show all possible paths
  results.forEach((result, index) => {
    console.log(`\nPath ${index + 1} (${result.joinPath.totalJoins} joins):`);
    result.joinPath.relations.forEach((rel) => {
      console.log(
        `  JOIN ${rel.to.table} ON ${rel.from.table}.${rel.from.columns[0]} = ${rel.to.table}.${rel.to.columns[0]}`
      );
    });
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

#### `getTableJoins(params: { tables: TableReference[] }): Promise<{ joinPath: JoinPath; sql: string }[] | null>`

Finds **all possible paths** to join multiple tables and generates complete SQL queries for each. Returns an array of results sorted by efficiency (shortest paths first), where each result contains:

- `sql`: Complete SELECT statement with all columns explicitly listed and proper JOIN clauses
- `joinPath`: Object containing the join path details with:
  - `tables`: All tables in the join path (input + intermediate)
  - `relations`: Join relations with column mappings
  - `inputTablesCount`: Number of input tables
  - `totalTablesCount`: Total tables including intermediates
  - `totalJoins`: Number of joins needed

**Key Features:**

- **Multiple Paths**: Returns all possible ways to connect the specified tables
- **Sorted Results**: Results are ordered by join complexity (fewest joins first)
- **Path Exploration**: Limited to maximum depth of 6 joins to prevent excessive computation
- **Deduplication**: Removes duplicate paths that use the same tables and relationships

The generated SQL for each path:

- Lists all columns explicitly from all joined tables
- Uses simple `JOIN` keyword for all joins
- Properly quotes identifiers (double quotes for PostgreSQL, backticks for MySQL)
- Includes fully qualified table names with schema prefixes

Returns `null` if tables cannot be connected through any path.

**Example Use Cases:**
- Compare different join strategies for query optimization
- Explore alternative relationships in complex schemas
- Debug connection issues by seeing all possible paths

#### `generatePlantumlSchema(params: { schema: TableSchema[] }): { full: string; simplified: string }`

Generates PlantUML ERD diagrams from the database schema. Returns both a full detailed version and a simplified version.

#### `safeQuery(params: { sql: string }): Promise<Record<string, unknown>[]>`

Executes SQL queries safely in a read-only transaction that is automatically rolled back. This allows you to:

- Test INSERT, UPDATE, DELETE operations without modifying data
- Execute complex SELECT queries with confidence
- Validate SQL syntax and logic before running in production
- Explore database changes safely

**Parameters:**
- `sql`: The SQL query to execute

**Returns:** Array of result records for SELECT queries, or empty array/metadata for modification queries

**Key Features:**
- **Automatic Rollback**: All transactions are rolled back regardless of success or failure
- **Cross-Database Support**: Works identically with PostgreSQL and MySQL
- **Error Handling**: Provides clear error messages for invalid SQL
- **Zero Risk**: No permanent changes are ever made to the database

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
