import { DatabaseService } from '../../services/database';
export const listCommand = async ({ db, output = 'simple' }) => {
  try {
    const databaseService = DatabaseService.fromUrl(db);
    const tables = await databaseService.getAllTableNames();
    if (output === 'json') {
      console.log(JSON.stringify(tables, null, 2));
    } else {
      // Simple format
      for (const { schema, table } of tables) {
        console.log(`${schema}.${table}`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};
export const listHelp = () => {
  console.log(`vsequel list - List all table names

Options:
  --db <url>      Database connection URL (required)
  --output <type> Output format: simple, json (default: simple)
  --help          Show this help message

Examples:
  vsequel list --db postgresql://localhost/mydb
  vsequel list --db postgresql://localhost/mydb --output json
  vsequel list --db mysql://localhost/mydb`);
};
//# sourceMappingURL=list-command.js.map
