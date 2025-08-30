import { DatabaseService } from '../../services/database';
export const sampleCommand = async ({ db, table, schema, limit }) => {
  try {
    const databaseService = DatabaseService.fromUrl(db);
    const sampleData = await databaseService.getSampleData({
      table,
      schema,
      limit,
    });
    console.log(JSON.stringify(sampleData, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};
export const sampleHelp = () => {
  console.log(`vsequel sample - Get sample data from a table

Options:
  --db <url>        Database connection URL (required)
  --table <name>    Table name (required)
  --schema <name>   Schema name (default: public for PostgreSQL)
  --limit <number>  Number of rows to return (default: 10)
  --help            Show this help message

Examples:
  vsequel sample --db postgresql://localhost/mydb --table users
  vsequel sample --db postgresql://localhost/mydb --table users --limit 5
  vsequel sample --db mysql://localhost/mydb --table users --schema myschema`);
};
//# sourceMappingURL=sample-command.js.map
