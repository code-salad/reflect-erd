import { strict as assert } from 'node:assert/strict';
import { describe, test } from 'node:test';
import { env } from '../src/config';
import { DatabaseService } from '../src/services/database/index';

// Top-level regex patterns for performance
const PLANTUML_RELATIONSHIP_REGEX = /\|\|--[o|]\{/;
const STARTUML_PATTERN = /@startuml/;
const ENDUML_PATTERN = /@enduml/;
const ENTITY_PATTERN = /entity/;
const CUSTOMERS_PATTERN = /customers/;
const PRIMARY_KEY_PATTERN = /<<PK>>/;
const QUOTE_PATTERN = /"table-with-dash"/;

describe('generatePlantumlSchema', () => {
  const mysqlDbUrl = env.MYSQL_URL;
  const postgresDbUrl = env.POSTGRES_URL;

  test('should generate PlantUML for PostgreSQL schema', async () => {
    const service = DatabaseService.fromUrl(postgresDbUrl);
    const schema = await service.getAllSchemas();
    const plantuml = service.generatePlantumlSchema({ schema });

    assert.ok(plantuml);
    assert.ok(plantuml.full);
    assert.ok(plantuml.simplified);

    // Check that the PlantUML contains expected elements
    assert.match(plantuml.full, STARTUML_PATTERN);
    assert.match(plantuml.full, ENDUML_PATTERN);
    assert.match(plantuml.full, ENTITY_PATTERN);
    assert.match(plantuml.full, CUSTOMERS_PATTERN);
    assert.match(plantuml.full, PRIMARY_KEY_PATTERN);

    // Check simplified version
    assert.match(plantuml.simplified, STARTUML_PATTERN);
    assert.match(plantuml.simplified, ENDUML_PATTERN);
    assert.match(plantuml.simplified, ENTITY_PATTERN);
    assert.match(plantuml.simplified, CUSTOMERS_PATTERN);
  });

  test('should generate PlantUML for MySQL schema', async () => {
    const service = DatabaseService.fromUrl(mysqlDbUrl);
    const schema = await service.getAllSchemas();
    const plantuml = service.generatePlantumlSchema({ schema });

    assert.ok(plantuml);
    assert.ok(plantuml.full);
    assert.ok(plantuml.simplified);

    // Check that the PlantUML contains expected elements
    assert.match(plantuml.full, STARTUML_PATTERN);
    assert.match(plantuml.full, ENDUML_PATTERN);
    assert.match(plantuml.full, ENTITY_PATTERN);
    assert.match(plantuml.full, CUSTOMERS_PATTERN);
    assert.match(plantuml.full, PRIMARY_KEY_PATTERN);

    // Check simplified version
    assert.match(plantuml.simplified, STARTUML_PATTERN);
    assert.match(plantuml.simplified, ENDUML_PATTERN);
    assert.match(plantuml.simplified, ENTITY_PATTERN);
    assert.match(plantuml.simplified, CUSTOMERS_PATTERN);
  });

  test('should handle foreign key relationships', async () => {
    const service = DatabaseService.fromUrl(postgresDbUrl);
    const schema = await service.getAllSchemas();
    const plantuml = service.generatePlantumlSchema({ schema });

    // Check for relationship notation in PlantUML
    assert.match(plantuml.full, PLANTUML_RELATIONSHIP_REGEX);
  });

  test('should escape special characters in table names', async () => {
    const service = DatabaseService.fromUrl(postgresDbUrl);
    const schema = await service.getAllSchemas();

    // Test with a mock schema that has special characters
    const mockSchema = [
      {
        ...schema[0],
        name: 'table-with-dash',
        schema: 'public',
        columns: [],
        primaryKey: null,
        foreignKeys: [],
        indexes: [],
        comment: null,
      },
    ];

    const plantuml = service.generatePlantumlSchema({ schema: mockSchema });
    assert.match(plantuml.full, QUOTE_PATTERN);
  });
});
