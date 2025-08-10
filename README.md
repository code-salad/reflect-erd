# reflect-erd

A TypeScript library for extracting database schemas and sample data from PostgreSQL and MySQL databases.

## Installation

```bash
# Using JSR (recommended)
npx jsr add @reflect/erd

# Using npm/yarn/pnpm/bun
npm install reflect-erd
```

## Usage

```typescript
import { ReflectErd } from '@reflect/erd';

// Initialize with your database URL
const db = new ReflectErd({
  databaseUrl: 'postgresql://user:password@localhost:5432/mydb'
});

// Pull the entire database schema
const schema = await db.pullSchema();

// Pull sample data from a specific table
const sampleData = await db.pullSampleData({
  table: 'users',
  schema: 'public' // optional
});

// Generate PlantUML diagrams
const diagrams = db.generatePlantumlSchema(schema);
console.log(diagrams.full); // Full detailed PlantUML
console.log(diagrams.simplified); // Simplified PlantUML
```

## Supported Databases

- PostgreSQL (via `postgresql://` or `postgres://`)
- MySQL (via `mysql://` or `mysql2://`)

## API

### `ReflectErd`

#### `pullSchema(): Promise<TableSchema[]>`
Retrieves the complete database schema including tables, columns, indexes, and foreign keys.

#### `pullSampleData(params: { table: string; schema?: string }): Promise<Record<string, unknown>[]>`
Retrieves sample data from a specific table.

#### `generatePlantumlSchema(schema: TableSchema[]): { full: string; simplified: string }`
Generates PlantUML ERD diagrams from the database schema. Returns both a full detailed version and a simplified version.

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run linting
bun run lint

# Run formatting
bun run format
```

## License

MIT
