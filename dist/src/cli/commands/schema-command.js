import { DatabaseService } from '../../services/database';
export const schemaCommand = async ({ db, output = 'full-plantuml' }) => {
  try {
    console.error('Extracting database schema...');
    const databaseService = DatabaseService.fromUrl(db);
    const schemas = await databaseService.getAllSchemas();
    console.error(`Successfully extracted ${schemas.length} tables`);
    switch (output) {
      case 'json': {
        console.log(JSON.stringify(schemas, null, 2));
        break;
      }
      case 'plantuml': {
        const result = databaseService.generatePlantumlSchema({
          schema: schemas,
        });
        console.log(result.simplified);
        break;
      }
      case 'full-plantuml': {
        const result = databaseService.generatePlantumlSchema({
          schema: schemas,
        });
        console.log(result.full);
        break;
      }
      default: {
        const result = databaseService.generatePlantumlSchema({
          schema: schemas,
        });
        console.log(result.full);
        break;
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};
export const schemaHelp = () => {
  console.log(`vsequel schema - Extract full database schema

Options:
  --db <url>      Database connection URL (required)
  --output <type> Output format: json, plantuml, full-plantuml (default: full-plantuml)
  --help          Show this help message

Examples:
  vsequel schema --db postgresql://localhost/mydb
  vsequel schema --db postgresql://localhost/mydb --output json
  vsequel schema --db mysql://localhost/mydb --output plantuml`);
};
//# sourceMappingURL=schema-command.js.map
