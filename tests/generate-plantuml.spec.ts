import { describe, expect, test } from 'bun:test';
import { env } from '../env';
import { DatabaseService } from '../src/services/database/index';

// Regex for PlantUML relationship notation
const PLANTUML_RELATIONSHIP_REGEX = /\|\|--[o|]\{/;

describe('generatePlantumlSchema', () => {
  const mysqlDbUrl = env.MYSQL_URL;
  const postgresDbUrl = env.POSTGRES_URL;

  test('should generate PlantUML for PostgreSQL schema', async () => {
    const service = DatabaseService.fromUrl(postgresDbUrl);
    const schema = await service.getAllSchemas();
    const plantuml = service.generatePlantumlSchema({ schema });

    expect(plantuml).toBeDefined();
    expect(plantuml.full).toBeDefined();
    expect(plantuml.simplified).toBeDefined();

    // Check that the PlantUML contains expected elements
    expect(plantuml.full).toContain('@startuml');
    expect(plantuml.full).toContain('@enduml');
    expect(plantuml.full).toContain('entity');
    expect(plantuml.full).toContain('customers');
    expect(plantuml.full).toContain('<<PK>>');

    // Check simplified version
    expect(plantuml.simplified).toContain('@startuml');
    expect(plantuml.simplified).toContain('@enduml');
    expect(plantuml.simplified).toContain('entity');
    expect(plantuml.simplified).toContain('customers');
  });

  test('should generate PlantUML for MySQL schema', async () => {
    const service = DatabaseService.fromUrl(mysqlDbUrl);
    const schema = await service.getAllSchemas();
    const plantuml = service.generatePlantumlSchema({ schema });

    expect(plantuml).toBeDefined();
    expect(plantuml.full).toBeDefined();
    expect(plantuml.simplified).toBeDefined();

    // Check that the PlantUML contains expected elements
    expect(plantuml.full).toContain('@startuml');
    expect(plantuml.full).toContain('@enduml');
    expect(plantuml.full).toContain('entity');
    expect(plantuml.full).toContain('customers');
    expect(plantuml.full).toContain('<<PK>>');

    // Check simplified version
    expect(plantuml.simplified).toContain('@startuml');
    expect(plantuml.simplified).toContain('@enduml');
    expect(plantuml.simplified).toContain('entity');
    expect(plantuml.simplified).toContain('customers');
  });

  test('should handle foreign key relationships', async () => {
    const service = DatabaseService.fromUrl(postgresDbUrl);
    const schema = await service.getAllSchemas();
    const plantuml = service.generatePlantumlSchema({ schema });

    // Check for relationship notation in PlantUML
    expect(plantuml.full).toMatch(PLANTUML_RELATIONSHIP_REGEX);
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
    expect(plantuml.full).toContain('"table-with-dash"');
  });
});
