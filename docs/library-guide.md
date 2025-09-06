# VSequel Library Guide

VSequel is a powerful TypeScript library for extracting database schemas, generating ERDs, and performing advanced database operations with PostgreSQL and MySQL databases.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Classes](#core-classes)
  - [DatabaseService](#databaseservice)
- [Schema Operations](#schema-operations)
- [Safe Query Execution](#safe-query-execution)
- [Join Path Finding](#join-path-finding)
- [PlantUML Generation](#plantuml-generation)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Installation

```bash
# Using npm
npm install vsequel

# Using yarn
yarn add vsequel

# Using pnpm
pnpm add vsequel

# Using bun
bun add vsequel
```

## Quick Start

```typescript
import { DatabaseService } from 'vsequel';
import type { TableSchema, JoinPath } from 'vsequel';

// Initialize from database URL
const db = DatabaseService.fromUrl(
  'postgresql://user:password@localhost:5432/mydb'
);

// Get all schemas
const schemas = await db.getAllSchemas();

// Generate PlantUML diagram
const diagrams = db.generatePlantumlSchema({ schema: schemas });
console.log(diagrams.full);

// Execute safe queries
const results = await db.safeQuery({
  sql: 'SELECT * FROM users LIMIT 10'
});
```

## Core Classes

### DatabaseService

The main class for interacting with databases. Supports both PostgreSQL and MySQL.

#### Creation

```typescript
// From database URL (recommended)
const db = DatabaseService.fromUrl('postgresql://user:pass@host:port/db');

// From provider instance (advanced)
import { PostgresProvider } from 'vsequel';
const provider = new PostgresProvider('postgresql://...');
const db = new DatabaseService({ provider });
```

#### Supported Database URLs

```typescript
// PostgreSQL
'postgresql://user:password@localhost:5432/database'
'postgres://user:password@localhost:5432/database'

// MySQL
'mysql://user:password@localhost:3306/database'
'mysql2://user:password@localhost:3306/database'
```

## Schema Operations

### Get All Table Names

```typescript
const tableNames = await db.getAllTableNames();
// Returns: Array<{ schema: string; table: string }>

console.log(tableNames);
// [
//   { schema: 'public', table: 'users' },
//   { schema: 'public', table: 'orders' },
//   { schema: 'inventory', table: 'products' }
// ]
```

### Get Complete Database Schema

```typescript
const schemas = await db.getAllSchemas();
// Returns: TableSchema[]

for (const table of schemas) {
  console.log(`Table: ${table.schema}.${table.name}`);
  console.log(`Columns: ${table.columns.length}`);
  console.log(`Foreign Keys: ${table.foreignKeys.length}`);
}
```

### Get Single Table Schema

```typescript
// Get specific table schema
const userSchema = await db.getSchema({
  table: 'users',
  schema: 'public' // optional
});

console.log(userSchema.columns);
console.log(userSchema.primaryKey);
console.log(userSchema.foreignKeys);
console.log(userSchema.indexes);
```

### Get Sample Data

```typescript
// Get sample data (default: 10 rows)
const sampleData = await db.getSampleData({
  table: 'users',
  schema: 'public',
  limit: 5 // optional
});

console.log(sampleData);
// [
//   { id: 1, name: 'John', email: 'john@example.com' },
//   { id: 2, name: 'Jane', email: 'jane@example.com' }
// ]
```

### Get Table Context (Schema + Sample Data)

```typescript
// Get both schema and sample data in parallel (faster)
const context = await db.getTableContext({
  table: 'users',
  schema: 'public'
});

console.log(context.schema); // TableSchema
console.log(context.sampleData); // Sample rows
```

## Safe Query Execution

Execute SQL queries safely with automatic rollback - perfect for testing queries without risk.

### Basic Usage

```typescript
// Execute SELECT queries
const users = await db.safeQuery({
  sql: 'SELECT * FROM users WHERE age > 18 LIMIT 10'
});
console.log(users); // Array of user records
```

### Testing Modifications Safely

```typescript
// Test INSERT without permanent changes
const insertResult = await db.safeQuery({
  sql: `INSERT INTO users (name, email) 
        VALUES ('Test User', 'test@example.com')`
});
// Data is automatically rolled back

// Test UPDATE operations
const updateResult = await db.safeQuery({
  sql: `UPDATE products 
        SET price = price * 1.1 
        WHERE category = 'electronics'`
});
// All changes are rolled back

// Test complex queries
const complexResult = await db.safeQuery({
  sql: `
    SELECT u.name, COUNT(o.id) as order_count 
    FROM users u 
    LEFT JOIN orders o ON u.id = o.user_id 
    GROUP BY u.id, u.name 
    ORDER BY order_count DESC
  `
});
```

### Error Handling

```typescript
try {
  const result = await db.safeQuery({
    sql: 'SELECT * FROM nonexistent_table'
  });
} catch (error) {
  console.error('Query failed:', error.message);
  // Handle SQL syntax errors, table not found, etc.
}
```

## Join Path Finding

Find all possible ways to join multiple tables and generate complete SQL queries.

### Basic Join Path Discovery

```typescript
const joinResults = await db.getTableJoins({
  tables: [
    { schema: 'public', table: 'orders' },
    { schema: 'public', table: 'customers' },
    { schema: 'public', table: 'products' }
  ]
});

if (joinResults && joinResults.length > 0) {
  console.log(`Found ${joinResults.length} possible join path(s)`);
  
  // Get the shortest path (most efficient)
  const shortestPath = joinResults[0];
  console.log('Generated SQL:');
  console.log(shortestPath.sql);
  
  // Examine join details
  const joinPath = shortestPath.joinPath;
  console.log(`Connects ${joinPath.inputTablesCount} input tables`);
  console.log(`Total tables in path: ${joinPath.totalTablesCount}`);
  console.log(`Joins required: ${joinPath.totalJoins}`);
}
```

### Advanced Join Analysis

```typescript
const joinResults = await db.getTableJoins({
  tables: [
    { schema: 'public', table: 'users' },
    { schema: 'public', table: 'orders' },
    { schema: 'public', table: 'order_items' },
    { schema: 'public', table: 'products' }
  ],
  maxDepth: 8 // Allow deeper searches (default: 6)
});

// Analyze all possible paths
joinResults?.forEach((result, index) => {
  console.log(`\nPath ${index + 1}:`);
  console.log(`Joins needed: ${result.joinPath.totalJoins}`);
  console.log(`Tables involved: ${result.joinPath.totalTablesCount}`);
  
  // Show join sequence
  result.joinPath.relations.forEach((relation, i) => {
    console.log(`  ${i + 1}. JOIN ${relation.to.schema}.${relation.to.table}`);
    console.log(`     ON ${relation.from.schema}.${relation.from.table}.${relation.from.columns[0]}`);
    console.log(`     = ${relation.to.schema}.${relation.to.table}.${relation.to.columns[0]}`);
  });
  
  // Use the generated SQL
  console.log('\nGenerated SQL:');
  console.log(result.sql);
});
```

### Join Path Features

- **Multiple Paths**: Returns ALL possible ways to connect tables
- **Efficiency Sorting**: Results ordered by join complexity (fewest joins first)
- **Complete SQL**: Generated queries include all columns from all tables
- **Database-Specific**: Proper identifier quoting for PostgreSQL/MySQL
- **Path Exploration**: Configurable maximum depth to prevent excessive computation
- **Intermediate Tables**: Automatically discovers required intermediate tables

## PlantUML Generation

Generate ERD diagrams in PlantUML format for documentation and visualization.

### Basic Usage

```typescript
const schemas = await db.getAllSchemas();
const diagrams = db.generatePlantumlSchema({ schema: schemas });

// Full detailed diagram
console.log(diagrams.full);
// Includes: tables, columns, data types, constraints, relationships

// Simplified diagram
console.log(diagrams.simplified);
// Includes: tables and relationships only
```

### Save to File

```typescript
import { writeFileSync } from 'fs';

const schemas = await db.getAllSchemas();
const diagrams = db.generatePlantumlSchema({ schema: schemas });

// Save full diagram
writeFileSync('database-schema.puml', diagrams.full);

// Generate PNG with PlantUML
// plantuml database-schema.puml
```

### Diagram Content

#### Full PlantUML includes:
- All tables with column details
- Data types and constraints
- Primary and foreign keys
- Nullable/required indicators
- Default values
- Relationships with cardinality

#### Simplified PlantUML includes:
- Table names only
- Foreign key relationships
- Clean overview for presentations

## Type Definitions

### Core Types

```typescript
// Table reference for operations
interface TableReference {
  schema: string;
  table: string;
}

// Complete table schema information
interface TableSchema {
  schema: string;
  name: string;
  comment: string | null;
  columns: ColumnSchema[];
  primaryKey: PrimaryKey | null;
  foreignKeys: ForeignKey[];
  indexes: IndexSchema[];
}

// Column definition
interface ColumnSchema {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  isAutoIncrement: boolean;
  comment: string | null;
}

// Foreign key definition
interface ForeignKey {
  name: string;
  columns: string[];
  referencedSchema: string;
  referencedTable: string;
  referencedColumns: string[];
  onUpdate: string | null;
  onDelete: string | null;
}

// Join path information
interface JoinPath {
  tables: TableReference[];          // All tables in join path
  relations: JoinRelation[];         // Join relationships
  inputTablesCount: number;          // Number of requested tables
  totalTablesCount: number;          // Total including intermediate tables
  totalJoins: number;                // Number of joins required
}

// Join relationship details
interface JoinRelation {
  from: {
    schema: string;
    table: string;
    columns: string[];               // Foreign key columns
  };
  to: {
    schema: string;
    table: string;
    columns: string[];               // Referenced columns
  };
  isNullable: boolean;               // If FK columns are nullable
}
```

### Primary Key and Index Types

```typescript
interface PrimaryKey {
  name: string | null;
  columns: string[];
}

interface IndexSchema {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}
```

## Error Handling

### Database Connection Errors

```typescript
try {
  const db = DatabaseService.fromUrl('invalid://connection/string');
} catch (error) {
  console.error('Invalid database URL:', error.message);
}
```

### Schema Operation Errors

```typescript
try {
  const schema = await db.getSchema({ 
    table: 'nonexistent_table',
    schema: 'public'
  });
} catch (error) {
  console.error('Table not found:', error.message);
}
```

### Join Path Errors

```typescript
try {
  const joinResults = await db.getTableJoins({
    tables: [
      { schema: 'public', table: 'isolated_table_1' },
      { schema: 'public', table: 'isolated_table_2' }
    ]
  });
  
  if (!joinResults) {
    console.log('No join path found between tables');
  }
} catch (error) {
  console.error('Join analysis failed:', error.message);
}
```

### Safe Query Errors

```typescript
try {
  const result = await db.safeQuery({
    sql: 'INVALID SQL SYNTAX'
  });
} catch (error) {
  console.error('SQL execution failed:', error.message);
  // Query is still safely rolled back
}
```

## Best Practices

### Connection Management

```typescript
// Create once, reuse throughout application
const db = DatabaseService.fromUrl(process.env.DATABASE_URL);

// Use connection pooling in production
const db = DatabaseService.fromUrl(
  'postgresql://user:pass@host:port/db?max=20'
);
```

### Performance Optimization

```typescript
// Use getTableContext for parallel schema + data fetch
const context = await db.getTableContext({
  table: 'large_table',
  schema: 'public'
});

// Limit sample data for large tables
const sampleData = await db.getSampleData({
  table: 'large_table',
  limit: 5
});

// Control join path depth for complex schemas
const joinResults = await db.getTableJoins({
  tables: [/* ... */],
  maxDepth: 4 // Reduce for better performance
});
```

### Type Safety

```typescript
// Use proper typing for better development experience
const schemas: TableSchema[] = await db.getAllSchemas();
const joinPaths: JoinPath[] = await db.findAllJoinPaths({
  tables: [{ schema: 'public', table: 'users' }]
});

// Type-safe result handling
const joinResults = await db.getTableJoins({ tables: [...] });
if (joinResults) {
  joinResults.forEach(result => {
    // result.joinPath and result.sql are properly typed
    console.log(result.sql);
  });
}
```

### Safe Query Usage

```typescript
// Always use safeQuery for testing/exploration
const testResult = await db.safeQuery({
  sql: 'SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL \'1 day\''
});

// Use for validating complex queries before production
const complexQuery = `
  WITH user_stats AS (
    SELECT user_id, COUNT(*) as order_count
    FROM orders 
    WHERE created_at > '2023-01-01'
    GROUP BY user_id
  )
  SELECT u.name, COALESCE(us.order_count, 0) as orders
  FROM users u
  LEFT JOIN user_stats us ON u.id = us.user_id
`;

const validationResult = await db.safeQuery({ sql: complexQuery });
// Query is tested safely before production use
```

### Error Recovery

```typescript
// Graceful handling of schema operations
const getTableSafely = async (tableName: string) => {
  try {
    return await db.getSchema({ table: tableName, schema: 'public' });
  } catch (error) {
    console.warn(`Could not load schema for ${tableName}:`, error.message);
    return null;
  }
};

// Robust join path discovery
const findJoinPathsSafely = async (tables: TableReference[]) => {
  try {
    const results = await db.getTableJoins({ tables, maxDepth: 6 });
    if (!results || results.length === 0) {
      console.info('No join paths found between specified tables');
      return [];
    }
    return results;
  } catch (error) {
    console.error('Join path analysis failed:', error.message);
    return [];
  }
};
```

This guide covers the essential aspects of using VSequel as a library. For CLI usage, see the [CLI Guide](./cli-guide.md).