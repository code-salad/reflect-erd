import { describe, expect, test } from 'bun:test';
import { $ } from 'bun';

const CLI_PATH = './src/cli/index.ts';

describe('CLI Subcommands', () => {
  describe('help command', () => {
    test('should show main help when no arguments provided', async () => {
      const result = await $`bun run ${CLI_PATH}`.quiet().nothrow();
      const stderr = result.stderr.toString();
      const stdout = result.stdout.toString();

      // Error goes to stderr
      expect(stderr).toContain('Command is required');
      // Help goes to stdout
      expect(stdout).toContain('vsequel - Database ERD extraction tool');
      expect(stdout).toContain('Subcommands:');
      expect(stdout).toContain('schema');
      expect(stdout).toContain('table');
      expect(stdout).toContain('list');
      expect(stdout).toContain('sample');
      expect(stdout).toContain('context');
      expect(stdout).toContain('join');
      expect(stdout).toContain('info');
    });

    test('should show help for schema subcommand', async () => {
      const result = await $`bun run ${CLI_PATH} schema --help`
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      expect(output).toContain('vsequel schema - Extract full database schema');
      expect(output).toContain('--output');
      expect(output).toContain('json');
      expect(output).toContain('plantuml');
      expect(output).toContain('full-plantuml');
    });

    test('should show help for table subcommand', async () => {
      const result = await $`bun run ${CLI_PATH} table --help`
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      expect(output).toContain(
        'vsequel table - Get schema for a specific table'
      );
      expect(output).toContain('--table');
      expect(output).toContain('--schema');
      expect(output).toContain('--with-sample');
    });

    test('should show help for list subcommand', async () => {
      const result = await $`bun run ${CLI_PATH} list --help`.quiet().nothrow();
      const output = result.stdout.toString();

      expect(output).toContain('vsequel list - List all table names');
      expect(output).toContain('--output');
      expect(output).toContain('simple');
      expect(output).toContain('json');
    });

    test('should show help for sample subcommand', async () => {
      const result = await $`bun run ${CLI_PATH} sample --help`
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      expect(output).toContain('vsequel sample - Get sample data from a table');
      expect(output).toContain('--table');
      expect(output).toContain('--schema');
      expect(output).toContain('--limit');
    });

    test('should show help for context subcommand', async () => {
      const result = await $`bun run ${CLI_PATH} context --help`
        .quiet()
        .nothrow();
      const output = result.stdout.toString();

      expect(output).toContain('vsequel context - Get schema and sample data');
      expect(output).toContain('--table');
      expect(output).toContain('--schema');
    });

    test('should show help for join subcommand', async () => {
      const result = await $`bun run ${CLI_PATH} join --help`.quiet().nothrow();
      const output = result.stdout.toString();

      expect(output).toContain('vsequel join - Find shortest join path');
      expect(output).toContain('--tables');
      expect(output).toContain('sql');
      expect(output).toContain('json');
    });

    test('should show help for info subcommand', async () => {
      const result = await $`bun run ${CLI_PATH} info --help`.quiet().nothrow();
      const output = result.stdout.toString();

      expect(output).toContain('vsequel info - Show database connection info');
      expect(output).toContain('--db');
    });
  });

  describe('error handling', () => {
    test('should error when database URL is missing for schema', async () => {
      const result = await $`bun run ${CLI_PATH} schema`.quiet().nothrow();
      const output = result.stderr.toString();

      expect(result.exitCode).not.toBe(0);
      expect(output).toContain('Database URL is required');
    });

    test('should error when database URL is missing for list', async () => {
      const result = await $`bun run ${CLI_PATH} list`.quiet().nothrow();
      const output = result.stderr.toString();

      expect(result.exitCode).not.toBe(0);
      expect(output).toContain('Database URL is required');
    });

    test('should error when table is missing for table command', async () => {
      const result =
        await $`bun run ${CLI_PATH} table --db postgresql://localhost/test`
          .quiet()
          .nothrow();
      const output = result.stderr.toString();

      expect(result.exitCode).not.toBe(0);
      expect(output).toContain('--table is required');
    });

    test('should error when table is missing for sample command', async () => {
      const result =
        await $`bun run ${CLI_PATH} sample --db postgresql://localhost/test`
          .quiet()
          .nothrow();
      const output = result.stderr.toString();

      expect(result.exitCode).not.toBe(0);
      expect(output).toContain('--table is required');
    });

    test('should error when table is missing for context command', async () => {
      const result =
        await $`bun run ${CLI_PATH} context --db postgresql://localhost/test`
          .quiet()
          .nothrow();
      const output = result.stderr.toString();

      expect(result.exitCode).not.toBe(0);
      expect(output).toContain('--table is required');
    });

    test('should error when tables is missing for join command', async () => {
      const result =
        await $`bun run ${CLI_PATH} join --db postgresql://localhost/test`
          .quiet()
          .nothrow();
      const output = result.stderr.toString();

      expect(result.exitCode).not.toBe(0);
      expect(output).toContain('--tables is required');
    });

    test('should error for unknown subcommand', async () => {
      const result =
        await $`bun run ${CLI_PATH} unknown --db postgresql://localhost/test`
          .quiet()
          .nothrow();
      const output = result.stderr.toString();

      expect(result.exitCode).not.toBe(0);
      expect(output).toContain("Unknown command 'unknown'");
    });
  });

  describe('backward compatibility removed', () => {
    test('should show main help when --help without subcommand', async () => {
      const result = await $`bun run ${CLI_PATH} --help`.quiet().nothrow();
      const output = result.stdout.toString();

      // When no subcommand is provided with --help, it should show main help
      expect(output).toContain('vsequel - Database ERD extraction tool');
      expect(output).toContain('Subcommands:');
    });

    test('should require explicit command', async () => {
      // This should fail without a subcommand
      const result =
        await $`bun run ${CLI_PATH} --db postgresql://invalid/test --output json`
          .quiet()
          .nothrow();
      const output = result.stderr.toString();

      // Should fail on missing command
      expect(output).toContain('Command is required');
    });
  });

  describe('output format validation', () => {
    test('should validate output format for schema command', async () => {
      const result =
        await $`bun run ${CLI_PATH} schema --db postgresql://localhost/test --output invalid`
          .quiet()
          .nothrow();
      const output = result.stderr.toString();

      expect(result.exitCode).not.toBe(0);
      expect(output).toContain("Invalid output format 'invalid'");
    });
  });
});

describe('CLI Integration Tests with Mock Database', () => {
  // These tests would require a running database, so we'll skip them in CI
  // but they're useful for local development

  // biome-ignore lint/suspicious/noSkippedTests: Integration tests require database
  test.skip('should list tables', async () => {
    const result = await $`bun run ${CLI_PATH} list --db $TEST_POSTGRES_URL`
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      expect(output).toContain('public.');
      expect(result.exitCode).toBe(0);
    }
  });

  // biome-ignore lint/suspicious/noSkippedTests: Integration tests require database
  test.skip('should get table schema', async () => {
    const result =
      await $`bun run ${CLI_PATH} table --db $TEST_POSTGRES_URL --table customers`
        .quiet()
        .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = JSON.parse(output);
      expect(json.name).toBe('customers');
      expect(json.columns).toBeDefined();
      expect(result.exitCode).toBe(0);
    }
  });

  // biome-ignore lint/suspicious/noSkippedTests: Integration tests require database
  test.skip('should get sample data', async () => {
    const result =
      await $`bun run ${CLI_PATH} sample --db $TEST_POSTGRES_URL --table customers`
        .quiet()
        .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = JSON.parse(output);
      expect(Array.isArray(json)).toBe(true);
      expect(result.exitCode).toBe(0);
    }
  });

  // biome-ignore lint/suspicious/noSkippedTests: Integration tests require database
  test.skip('should get table context', async () => {
    const result =
      await $`bun run ${CLI_PATH} context --db $TEST_POSTGRES_URL --table customers`
        .quiet()
        .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = JSON.parse(output);
      expect(json.schema).toBeDefined();
      expect(json.sampleData).toBeDefined();
      expect(result.exitCode).toBe(0);
    }
  });

  // biome-ignore lint/suspicious/noSkippedTests: Integration tests require database
  test.skip('should find join path', async () => {
    const result =
      await $`bun run ${CLI_PATH} join --db $TEST_POSTGRES_URL --tables orders,customers --output json`
        .quiet()
        .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = JSON.parse(output);
      expect(json.tables).toBeDefined();
      expect(json.relations).toBeDefined();
      expect(result.exitCode).toBe(0);
    }
  });

  // biome-ignore lint/suspicious/noSkippedTests: Integration tests require database
  test.skip('should generate SQL join statements', async () => {
    const result =
      await $`bun run ${CLI_PATH} join --db $TEST_POSTGRES_URL --tables orders,customers --output sql`
        .quiet()
        .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      expect(output).toContain('FROM');
      expect(output).toContain('JOIN');
      expect(output).toContain('ON');
      expect(result.exitCode).toBe(0);
    }
  });

  // biome-ignore lint/suspicious/noSkippedTests: Integration tests require database
  test.skip('should get database info', async () => {
    const result = await $`bun run ${CLI_PATH} info --db $TEST_POSTGRES_URL`
      .quiet()
      .nothrow();

    if (process.env.TEST_POSTGRES_URL) {
      const output = result.stdout.toString();
      const json = JSON.parse(output);
      expect(json.provider).toBe('postgres');
      expect(json.tableCount).toBeGreaterThan(0);
      expect(json.schemas).toBeDefined();
      expect(result.exitCode).toBe(0);
    }
  });
});
