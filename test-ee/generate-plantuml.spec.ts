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

  test('should return full PlantUML using getPlantuml method with type "full"', async () => {
    const service = DatabaseService.fromUrl(postgresDbUrl);
    const fullPlantuml = await service.getPlantuml({ type: 'full' });

    assert.ok(fullPlantuml);
    assert.ok(typeof fullPlantuml === 'string');

    // Check that the PlantUML contains expected elements
    assert.match(fullPlantuml, STARTUML_PATTERN);
    assert.match(fullPlantuml, ENDUML_PATTERN);
    assert.match(fullPlantuml, ENTITY_PATTERN);
    assert.match(fullPlantuml, CUSTOMERS_PATTERN);
    assert.match(fullPlantuml, PRIMARY_KEY_PATTERN);
  });

  test('should return simplified PlantUML using getPlantuml method with type "simple"', async () => {
    const service = DatabaseService.fromUrl(postgresDbUrl);
    const simplifiedPlantuml = await service.getPlantuml({ type: 'simple' });

    assert.ok(simplifiedPlantuml);
    assert.ok(typeof simplifiedPlantuml === 'string');

    // Check that the PlantUML contains expected elements
    assert.match(simplifiedPlantuml, STARTUML_PATTERN);
    assert.match(simplifiedPlantuml, ENDUML_PATTERN);
    assert.match(simplifiedPlantuml, ENTITY_PATTERN);
    assert.match(simplifiedPlantuml, CUSTOMERS_PATTERN);

    // Simplified version should NOT contain primary key details
    assert.doesNotMatch(simplifiedPlantuml, PRIMARY_KEY_PATTERN);
  });

  test('should default to full PlantUML when no type parameter is provided', async () => {
    const service = DatabaseService.fromUrl(postgresDbUrl);
    const defaultPlantuml = await service.getPlantuml();

    assert.ok(defaultPlantuml);
    assert.ok(typeof defaultPlantuml === 'string');

    // Should be equivalent to full version
    assert.match(defaultPlantuml, STARTUML_PATTERN);
    assert.match(defaultPlantuml, ENDUML_PATTERN);
    assert.match(defaultPlantuml, ENTITY_PATTERN);
    assert.match(defaultPlantuml, CUSTOMERS_PATTERN);
    assert.match(defaultPlantuml, PRIMARY_KEY_PATTERN);
  });

  test('should work with MySQL using getPlantuml method', async () => {
    const service = DatabaseService.fromUrl(mysqlDbUrl);
    const fullPlantuml = await service.getPlantuml({ type: 'full' });
    const simplifiedPlantuml = await service.getPlantuml({ type: 'simple' });

    // Test full version
    assert.ok(fullPlantuml);
    assert.match(fullPlantuml, STARTUML_PATTERN);
    assert.match(fullPlantuml, ENDUML_PATTERN);
    assert.match(fullPlantuml, ENTITY_PATTERN);
    assert.match(fullPlantuml, CUSTOMERS_PATTERN);
    assert.match(fullPlantuml, PRIMARY_KEY_PATTERN);

    // Test simplified version
    assert.ok(simplifiedPlantuml);
    assert.match(simplifiedPlantuml, STARTUML_PATTERN);
    assert.match(simplifiedPlantuml, ENDUML_PATTERN);
    assert.match(simplifiedPlantuml, ENTITY_PATTERN);
    assert.match(simplifiedPlantuml, CUSTOMERS_PATTERN);
  });
});
