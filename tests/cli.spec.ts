import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vitest';
import type { TableSchema } from '../src/services/database/types';
import { TEST_POSTGRES_URL } from './global-setup';

const execAsync = promisify(exec);

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
const PLANTUML_RELATIONSHIP_PATTERN = /\w+\s+\|\|--o\{|\w+\s+\|\|--o\{/;
const COLUMN_TYPE_PATTERN = /\w+\s*:\s*\w+/;
const PLANTUML_RELATIONSHIP_FULL_PATTERN = /\w+\s+\|\|--\|?\{/;
const SUCCESS_MESSAGE_PATTERN = /Successfully extracted \d+ tables/;

const postgresUrl = process.env.TEST_POSTGRES_URL || TEST_POSTGRES_URL;
const cliPath = './src/cli/index.ts';

describe('CLI tests', () => {
  test('should show help when --help flag is provided', async () => {
    const result = await $(`npx tsx ${cliPath} --help`).quiet().nothrow();

    expect(result.exitCode).toBe(0);
    // When no subcommand is provided, --help shows main help
    expect(result.stdout.toString()).toContain(
      'vsequel - Database ERD extraction tool'
    );
    expect(result.stdout.toString()).toContain('Subcommands:');
    expect(result.stdout.toString()).toContain('schema');
    expect(result.stdout.toString()).toContain('table');
    expect(result.stdout.toString()).toContain('list');
  });

  test('should show help when no command is provided', async () => {
    const result = await $(`npx tsx ${cliPath}`).quiet().nothrow();

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain('Command is required');
    expect(result.stdout.toString()).toContain(
      'vsequel - Database ERD extraction tool'
    );
  });

  test('should validate output format', async () => {
    const result = await $(
      `npx tsx ${cliPath} schema --db ${postgresUrl} --output invalid`
    )
      .quiet()
      .nothrow();

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain(
      "Invalid output format 'invalid'"
    );
  });

  test('should output JSON format', async () => {
    const result = await $(
      `npx tsx ${cliPath} schema --db ${postgresUrl} --output json`
    )
      .quiet()
      .nothrow();

    expect(result.exitCode).toBe(0);

    // Parse and validate JSON output
    const schema = JSON.parse(result.stdout.toString());
    expect(Array.isArray(schema)).toBe(true);
    expect(schema.length).toBeGreaterThan(0);

    // Check for expected tables
    const tableNames = schema.map((t: TableSchema) => t.name);
    expect(tableNames).toContain('categories');
    expect(tableNames).toContain('products');
    expect(tableNames).toContain('orders');

    // Verify table structure
    const productsTable = schema.find(
      (t: TableSchema) => t.name === 'products'
    );
    expect(productsTable).toBeDefined();
    expect(productsTable.columns).toBeDefined();
    expect(Array.isArray(productsTable.columns)).toBe(true);
  }, 15_000);

  test('should output simple PlantUML format', async () => {
    const result = await $(
      `npx tsx ${cliPath} schema --db ${postgresUrl} --output plantuml`
    )
      .quiet()
      .nothrow();

    expect(result.exitCode).toBe(0);

    const output = result.stdout.toString();
    // Check PlantUML format markers
    expect(output).toContain('@startuml');
    expect(output).toContain('@enduml');
    expect(output).toContain('entity');

    // Simple format should have table names but not detailed columns
    expect(output).toContain('categories');
    expect(output).toContain('products');

    // Check for relationships (simple format shows relationships)
    expect(output).toMatch(PLANTUML_RELATIONSHIP_PATTERN); // PlantUML relationship syntax
  }, 15_000);

  test('should output full PlantUML format (default)', async () => {
    const result = await $(
      `npx tsx ${cliPath} schema --db ${postgresUrl} --output full-plantuml`
    )
      .quiet()
      .nothrow();

    expect(result.exitCode).toBe(0);

    const output = result.stdout.toString();
    // Check PlantUML format markers
    expect(output).toContain('@startuml');
    expect(output).toContain('@enduml');
    expect(output).toContain('entity');

    // Full format should have table names AND columns
    expect(output).toContain('products');
    expect(output).toContain('id :');
    expect(output).toContain('name :');
    expect(output).toContain('price :');

    // Check for data types in full format
    expect(output).toMatch(COLUMN_TYPE_PATTERN); // column : type format

    // Check for relationships
    expect(output).toMatch(PLANTUML_RELATIONSHIP_FULL_PATTERN); // PlantUML relationship syntax
  }, 15_000);

  test('should use full-plantuml as default output format', async () => {
    const resultDefault = await $(
      `npx tsx ${cliPath} schema --db ${postgresUrl}`
    )
      .quiet()
      .nothrow();
    const resultFull = await $(
      `npx tsx ${cliPath} schema --db ${postgresUrl} --output full-plantuml`
    )
      .quiet()
      .nothrow();

    expect(resultDefault.exitCode).toBe(0);
    expect(resultFull.exitCode).toBe(0);

    // Default output should match full-plantuml output
    expect(resultDefault.stdout.toString()).toBe(resultFull.stdout.toString());
  }, 15_000);

  test('should handle database connection errors gracefully', async () => {
    const badUrl = 'postgresql://baduser:badpass@localhost:54321/nonexistent';
    const result = await $(
      `npx tsx ${cliPath} schema --db ${badUrl} --output json`
    )
      .quiet()
      .nothrow();

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain('Error:');
  }, 10_000);

  test('should report success message to stderr', async () => {
    const result = await $(
      `npx tsx ${cliPath} schema --db ${postgresUrl} --output json`
    )
      .quiet()
      .nothrow();

    expect(result.exitCode).toBe(0);
    expect(result.stderr.toString()).toContain('Extracting database schema...');
    expect(result.stderr.toString()).toMatch(SUCCESS_MESSAGE_PATTERN);
  }, 15_000);
});
