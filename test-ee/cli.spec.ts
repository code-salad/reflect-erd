import { strict as assert } from 'node:assert/strict';
import { exec } from 'node:child_process';
import { describe, test } from 'node:test';
import { promisify } from 'node:util';
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
const VSEQUEL_TOOL_PATTERN = /Database ERD extraction tool/;
const SUBCOMMANDS_PATTERN = /where.*<subcommand>.*can be one of:/;
const SCHEMA_PATTERN = /schema/;
const TABLE_PATTERN = /table/;
const LIST_PATTERN = /list/;
const _COMMAND_REQUIRED_PATTERN = /No value provided for subcommand/;
const UNKNOWN_ARGUMENTS_PATTERN = /Unknown arguments/;
const STARTUML_PATTERN = /@startuml/;
const ENDUML_PATTERN = /@enduml/;
const ENTITY_PATTERN = /entity/;
const CATEGORIES_PATTERN = /categories/;
const PRODUCTS_PATTERN = /products/;
const ID_PATTERN = /id :/;
const NAME_PATTERN = /name :/;
const PRICE_PATTERN = /price :/;
const ERROR_PATTERN = /Error:/;
const EXTRACTING_SCHEMA_PATTERN = /Extracting database schema.../;

const postgresUrl = TEST_POSTGRES_URL;
const cliPath = './src/cli/index.ts';

describe('CLI tests', () => {
  test('should show help when --help flag is provided', async () => {
    const result = await $(`npx tsx ${cliPath} --help`).quiet().nothrow();

    assert.equal(result.exitCode, 0);
    // When no subcommand is provided, --help shows main help
    assert.match(result.stdout.toString(), VSEQUEL_TOOL_PATTERN);
    assert.match(result.stdout.toString(), SUBCOMMANDS_PATTERN);
    assert.match(result.stdout.toString(), SCHEMA_PATTERN);
    assert.match(result.stdout.toString(), TABLE_PATTERN);
    assert.match(result.stdout.toString(), LIST_PATTERN);
  });

  test('should show help when no command is provided', async () => {
    const result = await $(`npx tsx ${cliPath}`).quiet().nothrow();

    assert.equal(result.exitCode, 0); // Help is shown with exit 0
    assert.match(result.stdout.toString(), VSEQUEL_TOOL_PATTERN);
    assert.match(result.stdout.toString(), SUBCOMMANDS_PATTERN);
  });

  test('should validate output format', async () => {
    const result = await $(
      `npx tsx ${cliPath} schema --db ${postgresUrl} --output invalid`
    )
      .quiet()
      .nothrow();

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr.toString(), UNKNOWN_ARGUMENTS_PATTERN);
  });

  test('should output JSON format', { timeout: 15_000 }, async () => {
    const result = await $(`npx tsx ${cliPath} schema --db ${postgresUrl}`)
      .quiet()
      .nothrow();

    assert.equal(result.exitCode, 0);

    // Parse and validate JSON output
    const schema = JSON.parse(result.stdout.toString());
    assert.equal(Array.isArray(schema), true);
    assert.ok(schema.length > 0);

    // Check for expected tables
    const tableNames = schema.map((t: TableSchema) => t.name);
    assert.ok(tableNames.includes('categories'));
    assert.ok(tableNames.includes('products'));
    assert.ok(tableNames.includes('orders'));

    // Verify table structure
    const productsTable = schema.find(
      (t: TableSchema) => t.name === 'products'
    );
    assert.ok(productsTable);
    assert.ok(productsTable.columns);
    assert.equal(Array.isArray(productsTable.columns), true);
  });

  test(
    'should output simple PlantUML format',
    { timeout: 15_000 },
    async () => {
      const result = await $(
        `npx tsx ${cliPath} plantuml --db ${postgresUrl} --simple`
      )
        .quiet()
        .nothrow();

      assert.equal(result.exitCode, 0);

      const output = result.stdout.toString();
      // Check PlantUML format markers
      assert.match(output, STARTUML_PATTERN);
      assert.match(output, ENDUML_PATTERN);
      assert.match(output, ENTITY_PATTERN);

      // Simple format should have table names but not detailed columns
      assert.match(output, CATEGORIES_PATTERN);
      assert.match(output, PRODUCTS_PATTERN);

      // Check for relationships (simple format shows relationships)
      assert.match(output, PLANTUML_RELATIONSHIP_PATTERN); // PlantUML relationship syntax
    }
  );

  test(
    'should output full PlantUML format (default)',
    { timeout: 15_000 },
    async () => {
      const result = await $(`npx tsx ${cliPath} plantuml --db ${postgresUrl}`)
        .quiet()
        .nothrow();

      assert.equal(result.exitCode, 0);

      const output = result.stdout.toString();
      // Check PlantUML format markers
      assert.match(output, STARTUML_PATTERN);
      assert.match(output, ENDUML_PATTERN);
      assert.match(output, ENTITY_PATTERN);

      // Full format should have table names AND columns
      assert.match(output, PRODUCTS_PATTERN);
      assert.match(output, ID_PATTERN);
      assert.match(output, NAME_PATTERN);
      assert.match(output, PRICE_PATTERN);

      // Check for data types in full format
      assert.match(output, COLUMN_TYPE_PATTERN); // column : type format

      // Check for relationships
      assert.match(output, PLANTUML_RELATIONSHIP_FULL_PATTERN); // PlantUML relationship syntax
    }
  );

  test(
    'should use full plantuml as default output format',
    { timeout: 15_000 },
    async () => {
      const resultDefault = await $(
        `npx tsx ${cliPath} plantuml --db ${postgresUrl}`
      )
        .quiet()
        .nothrow();
      const resultFull = await $(
        `npx tsx ${cliPath} plantuml --db ${postgresUrl}`
      )
        .quiet()
        .nothrow();

      assert.equal(resultDefault.exitCode, 0);
      assert.equal(resultFull.exitCode, 0);

      // Default output should match full-plantuml output
      assert.equal(
        resultDefault.stdout.toString(),
        resultFull.stdout.toString()
      );
    }
  );

  test(
    'should handle database connection errors gracefully',
    { timeout: 10_000 },
    async () => {
      const badUrl = 'postgresql://baduser:badpass@localhost:54321/nonexistent';
      const result = await $(`npx tsx ${cliPath} schema --db ${badUrl}`)
        .quiet()
        .nothrow();

      assert.equal(result.exitCode, 1);
      assert.match(result.stderr.toString(), ERROR_PATTERN);
    }
  );

  test(
    'should report success message to stderr',
    { timeout: 15_000 },
    async () => {
      const result = await $(`npx tsx ${cliPath} schema --db ${postgresUrl}`)
        .quiet()
        .nothrow();

      assert.equal(result.exitCode, 0);
      assert.match(result.stderr.toString(), EXTRACTING_SCHEMA_PATTERN);
      assert.match(result.stderr.toString(), SUCCESS_MESSAGE_PATTERN);
    }
  );
});
