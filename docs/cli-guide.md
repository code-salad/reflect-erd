# VSequel CLI Guide

VSequel provides a comprehensive command-line interface for database schema analysis, ERD generation, and safe query execution. This guide covers all CLI commands with detailed examples and use cases.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Global Options](#global-options)
- [Commands](#commands)
  - [schema](#schema-command)
  - [table](#table-command)
  - [list](#list-command)
  - [sample](#sample-command)
  - [context](#context-command)
  - [join](#join-command)
  - [safe-query](#safe-query-command)
  - [info](#info-command)
- [Database Connections](#database-connections)
- [Output Formats](#output-formats)
- [Practical Examples](#practical-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Installation

### Using npx (Recommended)

No installation required - use directly:

```bash
npx vsequel --help
```

### Global Installation

```bash
# npm
npm install -g vsequel

# yarn
yarn global add vsequel

# pnpm
pnpm add -g vsequel

# bun
bun add -g vsequel
```

## Quick Start

```bash
# Generate ERD diagram
npx vsequel schema --db postgresql://localhost/mydb > schema.puml

# List all tables
npx vsequel list --db postgresql://localhost/mydb

# Get table details
npx vsequel table --db postgresql://localhost/mydb --table users

# Find join paths
npx vsequel join --db postgresql://localhost/mydb --tables orders,customers

# Execute queries safely
npx vsequel safe-query --db postgresql://localhost/mydb --sql "SELECT * FROM users LIMIT 5"
```

## Global Options

All commands support these global options:

- `-d, --db <url>` - Database connection URL (required)
- `-h, --help` - Show help for any command

### Database Connection URLs

```bash
# PostgreSQL
postgresql://user:password@host:port/database
postgres://user:password@host:port/database

# MySQL
mysql://user:password@host:port/database
mysql2://user:password@host:port/database
```

## Commands

### schema Command

Extract complete database schema and generate ERD diagrams.

**Usage:**
```bash
vsequel schema --db <database-url> [options]
vsequel --db <database-url> [options]  # schema is default
```

**Options:**
- `-o, --output <type>` - Output format:
  - `full-plantuml` (default) - Complete PlantUML with all details
  - `plantuml` - Simplified PlantUML (relationships only)
  - `json` - Raw schema data as JSON

**Examples:**

```bash
# Generate complete ERD diagram
npx vsequel schema --db postgresql://localhost/mydb

# Simplified diagram for presentations
npx vsequel schema --db postgresql://localhost/mydb --output plantuml

# Raw schema data for processing
npx vsequel schema --db postgresql://localhost/mydb --output json

# Save to file and generate PNG
npx vsequel schema --db postgresql://localhost/mydb > schema.puml
plantuml schema.puml
```

**Output Features:**
- **Full PlantUML**: Tables, columns, data types, constraints, relationships
- **Simplified PlantUML**: Table names and relationships only
- **JSON**: Complete schema metadata for programmatic use

### table Command

Get detailed information about a specific table.

**Usage:**
```bash
vsequel table --db <database-url> --table <table-name> [options]
```

**Options:**
- `-t, --table <name>` - Table name (required)
- `-s, --schema <name>` - Schema name (optional, defaults to default schema)
- `--with-sample` - Include sample data
- `-o, --output <type>` - Output format: `json` (default), `plantuml`

**Examples:**

```bash
# Get table schema
npx vsequel table --db postgresql://localhost/mydb --table users

# Include sample data
npx vsequel table --db postgresql://localhost/mydb --table users --with-sample

# Specify schema
npx vsequel table --db postgresql://localhost/mydb --table products --schema inventory

# Generate PlantUML for single table
npx vsequel table --db postgresql://localhost/mydb --table users --output plantuml
```

**Output Includes:**
- Column definitions and types
- Primary key information
- Foreign key relationships
- Index definitions
- Sample data (when requested)

### list Command

List all tables in the database.

**Usage:**
```bash
vsequel list --db <database-url> [options]
```

**Options:**
- `-o, --output <type>` - Output format: `list` (default), `json`

**Examples:**

```bash
# Simple list (one per line)
npx vsequel list --db postgresql://localhost/mydb

# JSON array for scripting
npx vsequel list --db postgresql://localhost/mydb --output json

# Use with other commands
npx vsequel list --db $DB_URL | head -5
```

**Use Cases:**
- Quick database overview
- Scripting and automation
- Finding table names for other commands

### sample Command

Get sample data from a specific table.

**Usage:**
```bash
vsequel sample --db <database-url> --table <table-name> [options]
```

**Options:**
- `--table <name>` - Table name (required)
- `--schema <name>` - Schema name (optional)
- `--limit <number>` - Maximum rows to return (default: 10)

**Examples:**

```bash
# Get sample data
npx vsequel sample --db postgresql://localhost/mydb --table users

# Limit results
npx vsequel sample --db postgresql://localhost/mydb --table orders --limit 3

# Specify schema
npx vsequel sample --db mysql://localhost/mydb --table products --schema inventory
```

**Perfect for:**
- Understanding data formats
- Documentation examples
- Quick data inspection

### context Command

Get both schema and sample data for a table in a single operation.

**Usage:**
```bash
vsequel context --db <database-url> --table <table-name> [options]
```

**Options:**
- `--table <name>` - Table name (required)
- `--schema <name>` - Schema name (optional)

**Examples:**

```bash
# Get complete table context
npx vsequel context --db postgresql://localhost/mydb --table users

# With schema specification
npx vsequel context --db postgresql://localhost/mydb --table orders --schema public
```

**Benefits:**
- Single command for complete table understanding
- Parallel execution for better performance
- Perfect for documentation and analysis

### join Command

Find all possible ways to join multiple tables and generate SQL queries.

**Usage:**
```bash
vsequel join --db <database-url> --tables <table-list> [options]
```

**Options:**
- `--tables <list>` - Comma-separated table names (required)
- `--output <type>` - Output format:
  - `sql` (default) - Complete SELECT query for shortest path
  - `json` - All possible join paths with details

**Examples:**

```bash
# Generate SQL for joining two tables
npx vsequel join --db postgresql://localhost/mydb --tables orders,customers

# Join multiple tables
npx vsequel join --db postgresql://localhost/mydb --tables users,orders,products

# Get all possible join paths
npx vsequel join --db postgresql://localhost/mydb --tables orders,customers,products --output json

# Use schema-qualified names
npx vsequel join --db postgresql://localhost/mydb --tables public.orders,public.customers

# Save generated SQL
npx vsequel join --db postgresql://localhost/mydb --tables orders,customers --output sql > join_query.sql
```

**Key Features:**

#### SQL Output Mode (`--output sql`)
Generates a complete, ready-to-use SELECT query:
- All columns from all joined tables explicitly listed
- Optimal JOIN sequence based on shortest path
- Database-specific identifier quoting
- Fully qualified table names

#### JSON Output Mode (`--output json`)
Returns detailed analysis of all possible join paths:
- Multiple join strategies sorted by efficiency
- Complete relationship information
- Join complexity metrics
- Intermediate table discovery

**Example SQL Output:**
```sql
SELECT
  "public"."orders"."id",
  "public"."orders"."customer_id",
  "public"."orders"."order_date",
  "public"."customers"."id",
  "public"."customers"."name",
  "public"."customers"."email"
FROM "public"."orders"
JOIN "public"."customers" ON "public"."orders"."customer_id" = "public"."customers"."id"
```

**Example JSON Output:**
```json
[
  {
    "joinPath": {
      "tables": [
        {"schema": "public", "table": "orders"},
        {"schema": "public", "table": "customers"}
      ],
      "relations": [...],
      "inputTablesCount": 2,
      "totalTablesCount": 2,
      "totalJoins": 1
    },
    "sql": "SELECT ..."
  }
]
```

### safe-query Command

Execute SQL queries safely with automatic rollback - perfect for testing without risk.

**Usage:**
```bash
vsequel safe-query --db <database-url> --sql <query>
```

**Options:**
- `--sql <query>` - SQL query to execute (required)
- `--db <url>` - Database connection URL (required)

**Examples:**

```bash
# Execute SELECT query
npx vsequel safe-query --db postgresql://localhost/mydb --sql "SELECT * FROM users LIMIT 5"

# Test INSERT safely (automatically rolled back)
npx vsequel safe-query --db postgresql://localhost/mydb --sql "INSERT INTO users (name, email) VALUES ('Test', 'test@example.com')"

# Test UPDATE operations
npx vsequel safe-query --db postgresql://localhost/mydb --sql "UPDATE products SET price = price * 1.1 WHERE category = 'electronics'"

# Test complex queries
npx vsequel safe-query --db postgresql://localhost/mydb --sql "
  SELECT u.name, COUNT(o.id) as order_count 
  FROM users u 
  LEFT JOIN orders o ON u.id = o.user_id 
  GROUP BY u.id, u.name
"

# Test DELETE operations safely
npx vsequel safe-query --db postgresql://localhost/mydb --sql "DELETE FROM temp_data WHERE created_at < NOW() - INTERVAL '30 days'"
```

**Key Features:**
- **Zero Risk**: All operations automatically rolled back
- **Full SQL Support**: INSERT, UPDATE, DELETE, complex SELECT
- **JSON Output**: Results returned as structured data
- **Error Handling**: Graceful handling of SQL errors
- **Cross-Database**: Works identically with PostgreSQL and MySQL

**Perfect for:**
- Testing queries before production deployment
- Exploring data without risk of corruption
- Learning SQL safely
- Validating complex query logic
- Training environments

### info Command

Display database connection information and basic statistics.

**Usage:**
```bash
vsequel info --db <database-url>
```

**Examples:**

```bash
# Get database info
npx vsequel info --db postgresql://localhost/mydb

# Check connection before other operations
npx vsequel info --db $DATABASE_URL
```

**Output Includes:**
- Database type and version
- Connection status
- Available schemas
- Table count summary

## Database Connections

### Environment Variables

```bash
# Set database URL as environment variable
export DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"
npx vsequel schema --db $DATABASE_URL

# Use in scripts
DB_URL="mysql://user:pass@localhost:3306/mydb"
npx vsequel list --db "$DB_URL"
```

### Connection Examples

```bash
# PostgreSQL with authentication
npx vsequel schema --db "postgresql://myuser:mypass@localhost:5432/mydb"

# MySQL with port and options
npx vsequel schema --db "mysql://user:pass@localhost:3306/database?charset=utf8"

# Local development
npx vsequel schema --db "postgresql://localhost/myapp_development"

# Production with SSL
npx vsequel schema --db "postgresql://user:pass@prod.example.com:5432/myapp?sslmode=require"
```

## Output Formats

### PlantUML Formats

#### Full PlantUML (`full-plantuml`)
```plantuml
@startuml
!define table(x) class x << (T,#FFAAAA) >>
!define pk(x) <u>x</u>
!define fk(x) <i>x</i>

table(users) {
  pk(id) : INTEGER NOT NULL
  name : VARCHAR(255)
  email : VARCHAR(255) UNIQUE
  created_at : TIMESTAMP
}

table(orders) {
  pk(id) : INTEGER NOT NULL
  fk(user_id) : INTEGER NOT NULL
  order_date : DATE
}

users ||--o{ orders : user_id
@enduml
```

#### Simplified PlantUML (`plantuml`)
```plantuml
@startuml
[users] ||--o{ [orders]
[orders] ||--o{ [order_items]
[order_items] }o--|| [products]
@enduml
```

### JSON Format

Structured data perfect for processing:

```json
{
  "schema": "public",
  "name": "users",
  "columns": [
    {
      "name": "id",
      "dataType": "integer",
      "isNullable": false,
      "isAutoIncrement": true
    }
  ],
  "primaryKey": {
    "name": "users_pkey",
    "columns": ["id"]
  },
  "foreignKeys": [],
  "indexes": []
}
```

## Practical Examples

### Database Documentation Workflow

```bash
#!/bin/bash
# Complete database documentation script

DB_URL="postgresql://localhost/myapp"
OUTPUT_DIR="docs/database"

mkdir -p "$OUTPUT_DIR"

# Generate complete ERD
npx vsequel schema --db "$DB_URL" > "$OUTPUT_DIR/full-schema.puml"

# Generate simplified ERD
npx vsequel schema --db "$DB_URL" --output plantuml > "$OUTPUT_DIR/simple-schema.puml"

# Export raw schema
npx vsequel schema --db "$DB_URL" --output json > "$OUTPUT_DIR/schema.json"

# List all tables
npx vsequel list --db "$DB_URL" > "$OUTPUT_DIR/tables.txt"

# Document key tables
for table in users orders products; do
  npx vsequel context --db "$DB_URL" --table "$table" > "$OUTPUT_DIR/table-$table.json"
done

# Generate PlantUML diagrams
plantuml "$OUTPUT_DIR"/*.puml
```

### Query Development Workflow

```bash
#!/bin/bash
# Safe query development workflow

DB_URL="postgresql://localhost/myapp"

# First, explore the data safely
npx vsequel safe-query --db "$DB_URL" --sql "SELECT COUNT(*) FROM users"

# Test complex query logic
npx vsequel safe-query --db "$DB_URL" --sql "
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as user_count
  FROM users 
  WHERE created_at > '2023-01-01'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month
"

# Find join paths for reporting
npx vsequel join --db "$DB_URL" --tables users,orders,order_items,products --output sql > report_query.sql

# Test the generated query safely
QUERY=$(cat report_query.sql)
npx vsequel safe-query --db "$DB_URL" --sql "$QUERY LIMIT 10"
```

### Database Migration Planning

```bash
#!/bin/bash
# Analyze impact before schema changes

DB_URL="postgresql://localhost/myapp"

# Document current state
npx vsequel table --db "$DB_URL" --table users --with-sample > before_migration.json

# Test migration queries safely
npx vsequel safe-query --db "$DB_URL" --sql "
  ALTER TABLE users ADD COLUMN phone VARCHAR(20);
  UPDATE users SET phone = '555-0000' WHERE id = 1;
"

# Verify join paths still work
npx vsequel join --db "$DB_URL" --tables users,profiles --output json
```

### Performance Analysis

```bash
#!/bin/bash
# Database performance analysis

DB_URL="postgresql://localhost/myapp"

# Analyze table sizes
npx vsequel safe-query --db "$DB_URL" --sql "
  SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
  FROM pg_stats 
  WHERE schemaname = 'public'
  ORDER BY tablename, attname
"

# Check for missing indexes on foreign keys
npx vsequel schema --db "$DB_URL" --output json | \
  jq -r '.[] | select(.foreignKeys | length > 0) | .name'
```

## Best Practices

### Security

```bash
# Use environment variables for credentials
export DB_URL="postgresql://user:$(cat ~/.dbpass)@localhost:5432/mydb"
npx vsequel schema --db "$DB_URL"

# Avoid credentials in command history
read -s DB_PASS
npx vsequel schema --db "postgresql://user:$DB_PASS@localhost:5432/mydb"
```

### Performance

```bash
# Limit sample data for large tables
npx vsequel sample --db "$DB_URL" --table large_table --limit 3

# Use simplified PlantUML for large schemas
npx vsequel schema --db "$DB_URL" --output plantuml

# Control join complexity
npx vsequel join --db "$DB_URL" --tables table1,table2,table3
# For complex schemas with many tables, be selective
```

### Automation

```bash
# Pipeline-friendly output
TABLES=$(npx vsequel list --db "$DB_URL" --output json | jq -r '.[].table')

# Process each table
echo "$TABLES" | while read -r table; do
  npx vsequel table --db "$DB_URL" --table "$table" --output json > "schemas/$table.json"
done

# Generate reports
npx vsequel schema --db "$DB_URL" --output json | \
  jq '.[] | {name: .name, columns: .columns | length, foreignKeys: .foreignKeys | length}'
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
npx vsequel info --db "$DB_URL"

# Check if database exists
npx vsequel list --db "$DB_URL"

# Verify credentials
npx vsequel safe-query --db "$DB_URL" --sql "SELECT current_user"
```

### Common Errors

**"Database not found"**
```bash
# Check database name in URL
npx vsequel info --db "postgresql://user:pass@host:port/correct_db_name"
```

**"Permission denied"**
```bash
# Use read-only user
npx vsequel safe-query --db "$DB_URL" --sql "SELECT current_user, session_user"
```

**"No join path found"**
```bash
# Check if tables have foreign key relationships
npx vsequel table --db "$DB_URL" --table table1 --output json | jq '.foreignKeys'
npx vsequel table --db "$DB_URL" --table table2 --output json | jq '.foreignKeys'
```

**"Table not found"**
```bash
# List all available tables
npx vsequel list --db "$DB_URL"

# Check specific schema
npx vsequel table --db "$DB_URL" --table table_name --schema schema_name
```

### Debug Mode

```bash
# Enable verbose output (if supported by environment)
DEBUG=vsequel* npx vsequel schema --db "$DB_URL"

# Check for detailed error information
npx vsequel safe-query --db "$DB_URL" --sql "SELECT version()" 2>&1
```

This comprehensive CLI guide covers all aspects of using VSequel from the command line. For library usage in your applications, see the [Library Guide](./library-guide.md).