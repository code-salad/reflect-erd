import { strict as assert } from 'node:assert/strict';
import { exec } from 'node:child_process';
import { describe, test } from 'node:test';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Helper function to safely parse JSON with fallback
const safeJsonParse = (output: string): Record<string, unknown>[] => {
  try {
    const trimmed = output.trim();
    if (!trimmed) {
      return [];
    }
    return JSON.parse(trimmed);
  } catch {
    console.warn('Failed to parse JSON output:', output);
    return [];
  }
};

// Helper to simulate Bun's $ behavior
const $ = (command: string) => {
  const executeCommand = async () => {
    try {
      const result = await execAsync(command);
      return {
        exitCode: 0,
        stdout: Buffer.from(result.stdout),
        stderr: Buffer.from(result.stderr),
      };
    } catch (error: unknown) {
      const execError = error as {
        code?: number;
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      return {
        exitCode: execError.code || 1,
        stdout: Buffer.from(execError.stdout || ''),
        stderr: Buffer.from(execError.stderr || execError.message || ''),
      };
    }
  };

  return {
    quiet() {
      return this;
    },
    nothrow() {
      return executeCommand();
    },
  };
};

// Top-level regex patterns for performance
const VSEQUEL_TOOL_PATTERN = /vsequel - Database ERD extraction tool/;
const SUBCOMMANDS_PATTERN = /Subcommands:/;
const SCHEMA_PATTERN = /schema/;
const TABLE_PATTERN = /table/;
const LIST_PATTERN = /list/;
const SAMPLE_PATTERN = /sample/;
const CONTEXT_PATTERN = /context/;
const JOIN_PATTERN = /join/;
const INFO_PATTERN = /info/;
const SAFE_QUERY_PATTERN = /safe-query/;
const COMMAND_REQUIRED_PATTERN = /Command is required/;
const EXTRACT_FULL_SCHEMA_PATTERN = /Extract full database schema/;
const OUTPUT_OPTION_PATTERN = /--output/;
const JSON_PATTERN = /json/;
const PLANTUML_PATTERN = /plantuml/;
const FULL_PLANTUML_PATTERN = /full-plantuml/;
const GET_SCHEMA_TABLE_PATTERN = /Get schema for a specific table/;
const TABLE_OPTION_PATTERN = /--table/;
const SCHEMA_OPTION_PATTERN = /--schema/;
const WITH_SAMPLE_PATTERN = /--with-sample/;
const LIST_TABLE_NAMES_PATTERN = /List all table names/;
const SIMPLE_PATTERN = /simple/;
const GET_SAMPLE_DATA_PATTERN = /Get sample data from a table/;
const LIMIT_PATTERN = /--limit/;
const GET_SCHEMA_SAMPLE_PATTERN = /Get schema and sample data/;
const FIND_JOIN_PATH_PATTERN = /Find shortest join path/;
const TABLES_OPTION_PATTERN = /--tables/;
const SQL_PATTERN = /sql/;
const SHOW_DATABASE_INFO_PATTERN = /Show database connection info/;
const DB_OPTION_PATTERN = /--db/;
const DATABASE_URL_REQUIRED_PATTERN = /Database URL is required/;
const TABLE_REQUIRED_PATTERN = /--table is required/;
const TABLES_REQUIRED_PATTERN = /--tables is required/;
const SQL_REQUIRED_PATTERN = /--sql is required/;
const SAFE_QUERY_HELP_PATTERN =
  /Execute SQL query safely in read-only transaction/;
const READ_ONLY_TRANSACTION_PATTERN = /read-only transaction/;
const AUTOMATICALLY_ROLLED_BACK_PATTERN = /automatically rolled back/;
const UNKNOWN_COMMAND_PATTERN = /Unknown command 'unknown'/;
const INVALID_OUTPUT_FORMAT_PATTERN = /Invalid output format 'invalid'/;
const PUBLIC_SCHEMA_PATTERN = /public\./;
const FROM_PATTERN = /FROM/;
const JOIN_SQL_PATTERN = /JOIN/;
const ON_PATTERN = /ON/;

const CLI_PATH = './src/cli/index.ts';

describe('CLI Subcommands', () => {
  describe('help command', () => {
    test('should show main help when no arguments provided', async () => {
      const result = await $(`npx tsx ${CLI_PATH}`).quiet().nothrow();
      const stderr = result.stderr.toString();
      const stdout = result.stdout.toString();

      // Error goes to stderr
      assert.match(stderr, COMMAND_REQUIRED_PATTERN);
      // Help goes to stdout
      assert.match(stdout, VSEQUEL_TOOL_PATTERN);
      assert.match(stdout, SUBCOMMANDS_PATTERN);
      assert.match(stdout, SCHEMA_PATTERN);
      assert.match(stdout, TABLE_PATTERN);
      assert.match(stdout, LIST_PATTERN);
      assert.match(stdout, SAMPLE_PATTERN);
      assert.match(stdout, CONTEXT_PATTERN);
      assert.match(stdout, JOIN_PATTERN);
      assert.match(stdout, SAFE_QUERY_PATTERN);
      assert.match(stdout, INFO_PATTERN);
    });

    test('should show help for schema subcommand', async () => {
      const result = await $(`npx tsx ${CLI_PATH} schema --help`)
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      assert.match(output, EXTRACT_FULL_SCHEMA_PATTERN);
      assert.match(output, OUTPUT_OPTION_PATTERN);
      assert.match(output, JSON_PATTERN);
      assert.match(output, PLANTUML_PATTERN);
      assert.match(output, FULL_PLANTUML_PATTERN);
    });

    test('should show help for table subcommand', async () => {
      const result = await $(`npx tsx ${CLI_PATH} table --help`)
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      assert.match(output, GET_SCHEMA_TABLE_PATTERN);
      assert.match(output, TABLE_OPTION_PATTERN);
      assert.match(output, SCHEMA_OPTION_PATTERN);
      assert.match(output, WITH_SAMPLE_PATTERN);
    });

    test('should show help for list subcommand', async () => {
      const result = await $(`npx tsx ${CLI_PATH} list --help`)
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      assert.match(output, LIST_TABLE_NAMES_PATTERN);
      assert.match(output, OUTPUT_OPTION_PATTERN);
      assert.match(output, SIMPLE_PATTERN);
      assert.match(output, JSON_PATTERN);
    });

    test('should show help for sample subcommand', async () => {
      const result = await $(`npx tsx ${CLI_PATH} sample --help`)
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      assert.match(output, GET_SAMPLE_DATA_PATTERN);
      assert.match(output, TABLE_OPTION_PATTERN);
      assert.match(output, SCHEMA_OPTION_PATTERN);
      assert.match(output, LIMIT_PATTERN);
    });

    test('should show help for context subcommand', async () => {
      const result = await $(`npx tsx ${CLI_PATH} context --help`)
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      assert.match(output, GET_SCHEMA_SAMPLE_PATTERN);
      assert.match(output, TABLE_OPTION_PATTERN);
      assert.match(output, SCHEMA_OPTION_PATTERN);
    });

    test('should show help for join subcommand', async () => {
      const result = await $(`npx tsx ${CLI_PATH} join --help`)
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      assert.match(output, FIND_JOIN_PATH_PATTERN);
      assert.match(output, TABLES_OPTION_PATTERN);
      assert.match(output, SQL_PATTERN);
      assert.match(output, JSON_PATTERN);
    });

    test('should show help for safe-query subcommand', async () => {
      const result = await $(`npx tsx ${CLI_PATH} safe-query --help`)
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      assert.match(output, SAFE_QUERY_HELP_PATTERN);
      assert.match(output, DB_OPTION_PATTERN);
      assert.match(output, SQL_PATTERN);
      assert.match(output, READ_ONLY_TRANSACTION_PATTERN);
      assert.match(output, AUTOMATICALLY_ROLLED_BACK_PATTERN);
    });

    test('should show help for info subcommand', async () => {
      const result = await $(`npx tsx ${CLI_PATH} info --help`)
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      assert.match(output, SHOW_DATABASE_INFO_PATTERN);
      assert.match(output, DB_OPTION_PATTERN);
    });
  });

  describe('error handling', () => {
    test('should error when database URL is missing for schema', async () => {
      const result = await $(`npx tsx ${CLI_PATH} schema`).quiet().nothrow();
      const output = result.stderr.toString();

      assert.ok(result.exitCode !== 0);
      assert.match(output, DATABASE_URL_REQUIRED_PATTERN);
    });

    test('should error when database URL is missing for list', async () => {
      const result = await $(`npx tsx ${CLI_PATH} list`).quiet().nothrow();
      const output = result.stderr.toString();

      assert.ok(result.exitCode !== 0);
      assert.match(output, DATABASE_URL_REQUIRED_PATTERN);
    });

    test('should error when table is missing for table command', async () => {
      const result = await $(
        `npx tsx ${CLI_PATH} table --db postgresql://localhost/test`
      )
        .quiet()
        .nothrow();
      const output = result.stderr.toString();

      assert.ok(result.exitCode !== 0);
      assert.match(output, TABLE_REQUIRED_PATTERN);
    });

    test('should error when table is missing for sample command', async () => {
      const result = await $(
        `npx tsx ${CLI_PATH} sample --db postgresql://localhost/test`
      )
        .quiet()
        .nothrow();
      const output = result.stderr.toString();

      assert.ok(result.exitCode !== 0);
      assert.match(output, TABLE_REQUIRED_PATTERN);
    });

    test('should error when table is missing for context command', async () => {
      const result = await $(
        `npx tsx ${CLI_PATH} context --db postgresql://localhost/test`
      )
        .quiet()
        .nothrow();
      const output = result.stderr.toString();

      assert.ok(result.exitCode !== 0);
      assert.match(output, TABLE_REQUIRED_PATTERN);
    });

    test('should error when tables is missing for join command', async () => {
      const result = await $(
        `npx tsx ${CLI_PATH} join --db postgresql://localhost/test`
      )
        .quiet()
        .nothrow();
      const output = result.stderr.toString();

      assert.ok(result.exitCode !== 0);
      assert.match(output, TABLES_REQUIRED_PATTERN);
    });

    test('should error when database URL is missing for safe-query', async () => {
      const result = await $(`npx tsx ${CLI_PATH} safe-query --sql "SELECT 1"`)
        .quiet()
        .nothrow();
      const output = result.stderr.toString();

      assert.ok(result.exitCode !== 0);
      assert.match(output, DATABASE_URL_REQUIRED_PATTERN);
    });

    test('should error when SQL is missing for safe-query command', async () => {
      const result = await $(
        `npx tsx ${CLI_PATH} safe-query --db postgresql://localhost/test`
      )
        .quiet()
        .nothrow();
      const output = result.stderr.toString();

      assert.ok(result.exitCode !== 0);
      assert.match(output, SQL_REQUIRED_PATTERN);
    });

    test('should error for unknown subcommand', async () => {
      const result = await $(
        `npx tsx ${CLI_PATH} unknown --db postgresql://localhost/test`
      )
        .quiet()
        .nothrow();
      const output = result.stderr.toString();

      assert.ok(result.exitCode !== 0);
      assert.match(output, UNKNOWN_COMMAND_PATTERN);
    });
  });

  describe('backward compatibility removed', () => {
    test('should show main help when --help without subcommand', async () => {
      const result = await $(`npx tsx ${CLI_PATH} --help`).quiet().nothrow();
      const output = result.stdout.toString();

      // When no subcommand is provided with --help, it should show main help
      assert.match(output, VSEQUEL_TOOL_PATTERN);
      assert.match(output, SUBCOMMANDS_PATTERN);
    });

    test('should require explicit command', async () => {
      // This should fail without a subcommand
      const result = await $(
        `npx tsx ${CLI_PATH} --db postgresql://invalid/test --output json`
      )
        .quiet()
        .nothrow();
      const output = result.stderr.toString();

      // Should fail on missing command
      assert.match(output, COMMAND_REQUIRED_PATTERN);
    });
  });

  describe('output format validation', () => {
    test('should validate output format for schema command', async () => {
      const result = await $(
        `npx tsx ${CLI_PATH} schema --db postgresql://localhost/test --output invalid`
      )
        .quiet()
        .nothrow();
      const output = result.stderr.toString();

      assert.ok(result.exitCode !== 0);
      assert.match(output, INVALID_OUTPUT_FORMAT_PATTERN);
    });
  });
});

describe('CLI Integration Tests with Mock Database', () => {
  // These tests would require a running database, so we'll skip them in CI
  // but they're useful for local development

  test('should list tables', async () => {
    const result = await $(`npx tsx ${CLI_PATH} list --db "$TEST_POSTGRES_URL"`)
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      assert.match(output, PUBLIC_SCHEMA_PATTERN);
      if (result.exitCode !== 0) {
        console.error('Command failed with exit code:', result.exitCode);
        console.error('Stderr:', result.stderr.toString());
        console.error('Stdout:', result.stdout.toString());
      }
      assert.equal(result.exitCode, 0);
    }
  });

  test('should get table schema', async () => {
    const result = await $(
      `npx tsx ${CLI_PATH} table --db "$TEST_POSTGRES_URL" --table customers`
    )
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = safeJsonParse(output);
      assert.equal(json.name, 'customers');
      assert.ok(json.columns);
      if (result.exitCode !== 0) {
        console.error('Command failed with exit code:', result.exitCode);
        console.error('Stderr:', result.stderr.toString());
        console.error('Stdout:', result.stdout.toString());
      }
      assert.equal(result.exitCode, 0);
    }
  });

  test('should get sample data', async () => {
    const result = await $(
      `npx tsx ${CLI_PATH} sample --db "$TEST_POSTGRES_URL" --table customers`
    )
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = safeJsonParse(output);
      assert.equal(Array.isArray(json), true);
      if (result.exitCode !== 0) {
        console.error('Command failed with exit code:', result.exitCode);
        console.error('Stderr:', result.stderr.toString());
        console.error('Stdout:', result.stdout.toString());
      }
      assert.equal(result.exitCode, 0);
    }
  });

  test('should get table context', async () => {
    const result = await $(
      `npx tsx ${CLI_PATH} context --db "$TEST_POSTGRES_URL" --table customers`
    )
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = safeJsonParse(output);
      assert.ok(json.schema);
      assert.ok(json.sampleData);
      if (result.exitCode !== 0) {
        console.error('Command failed with exit code:', result.exitCode);
        console.error('Stderr:', result.stderr.toString());
        console.error('Stdout:', result.stdout.toString());
      }
      assert.equal(result.exitCode, 0);
    }
  });

  test('should find join path', async () => {
    const result = await $(
      `npx tsx ${CLI_PATH} join --db "$TEST_POSTGRES_URL" --tables orders,customers --output json`
    )
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = safeJsonParse(output);
      assert.ok(json.tables);
      assert.ok(json.relations);
      if (result.exitCode !== 0) {
        console.error('Command failed with exit code:', result.exitCode);
        console.error('Stderr:', result.stderr.toString());
        console.error('Stdout:', result.stdout.toString());
      }
      assert.equal(result.exitCode, 0);
    }
  });

  test('should generate SQL join statements', async () => {
    const result = await $(
      `npx tsx ${CLI_PATH} join --db "$TEST_POSTGRES_URL" --tables orders,customers --output sql`
    )
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      assert.match(output, FROM_PATTERN);
      assert.match(output, JOIN_SQL_PATTERN);
      assert.match(output, ON_PATTERN);
      if (result.exitCode !== 0) {
        console.error('Command failed with exit code:', result.exitCode);
        console.error('Stderr:', result.stderr.toString());
        console.error('Stdout:', result.stdout.toString());
      }
      assert.equal(result.exitCode, 0);
    }
  });

  test('should execute safe query with SELECT', async () => {
    const result = await $(
      `npx tsx ${CLI_PATH} safe-query --db "$TEST_POSTGRES_URL" --sql "SELECT * FROM products LIMIT 3"`
    )
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = safeJsonParse(output);
      assert.ok(Array.isArray(json));
      assert.ok(json.length <= 3);
      if (result.exitCode !== 0) {
        console.error('Command failed with exit code:', result.exitCode);
        console.error('Stderr:', result.stderr.toString());
        console.error('Stdout:', result.stdout.toString());
      }
      assert.equal(result.exitCode, 0);
    }
  });

  test('should execute safe query with INSERT (rolled back)', async () => {
    const result = await $(
      `npx tsx ${CLI_PATH} safe-query --db "$TEST_POSTGRES_URL" --sql "INSERT INTO products (name, price) VALUES ('test-product', 99.99) RETURNING *"`
    )
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = safeJsonParse(output);
      assert.ok(Array.isArray(json));
      assert.equal(json[0]?.name, 'test-product');
      if (result.exitCode !== 0) {
        console.error('Command failed with exit code:', result.exitCode);
        console.error('Stderr:', result.stderr.toString());
        console.error('Stdout:', result.stdout.toString());
      }
      assert.equal(result.exitCode, 0);

      // Verify the insert was rolled back by running another query
      const checkResult = await $(
        `npx tsx ${CLI_PATH} safe-query --db "$TEST_POSTGRES_URL" --sql "SELECT COUNT(*) as count FROM products WHERE name = 'test-product'"`
      )
        .quiet()
        .nothrow();

      const checkJson = JSON.parse(checkResult.stdout.toString());
      assert.equal(Number(checkJson[0]?.count), 0);
    }
  });

  test('should execute safe query with UPDATE (rolled back)', async () => {
    const result = await $(
      `npx tsx ${CLI_PATH} safe-query --db "$TEST_POSTGRES_URL" --sql "UPDATE products SET price = 999.99 WHERE id = 1 RETURNING *"`
    )
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = safeJsonParse(output);
      assert.ok(Array.isArray(json));
      if (json.length > 0) {
        assert.equal(Number(json[0]?.price), 999.99);
      }
      if (result.exitCode !== 0) {
        console.error('Command failed with exit code:', result.exitCode);
        console.error('Stderr:', result.stderr.toString());
        console.error('Stdout:', result.stdout.toString());
      }
      assert.equal(result.exitCode, 0);
    }
  });

  test('should get database info', async () => {
    const result = await $(`npx tsx ${CLI_PATH} info --db "$TEST_POSTGRES_URL"`)
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = safeJsonParse(output);
      assert.equal(json.provider, 'postgres');
      assert.ok(json.tableCount > 0);
      assert.ok(json.schemas);
      if (result.exitCode !== 0) {
        console.error('Command failed with exit code:', result.exitCode);
        console.error('Stderr:', result.stderr.toString());
        console.error('Stdout:', result.stdout.toString());
      }
      assert.equal(result.exitCode, 0);
    }
  });
});
