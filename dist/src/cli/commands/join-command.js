import { DatabaseService } from '../../services/database';
export const joinCommand = async ({ db, tables, output = 'json' }) => {
  try {
    const databaseService = DatabaseService.fromUrl(db);
    // Parse tables string into TableReference array
    const tableList = tables.split(',').map((t) => {
      const parts = t.trim().split('.');
      if (parts.length === 2) {
        return { schema: parts[0], table: parts[1] };
      }
      // Default to public schema for PostgreSQL, need to handle MySQL differently
      return { schema: 'public', table: parts[0] };
    });
    const result = await databaseService.getTableJoins({
      tables: tableList,
    });
    if (!result) {
      console.error('No join path found between the specified tables');
      process.exit(1);
    }
    if (output === 'sql') {
      // Output the generated SQL
      console.log(result.sql);
    } else {
      // JSON output
      console.log(JSON.stringify(result.joinPath, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};
export const joinHelp = () => {
  console.log(`vsequel join - Find shortest join path between tables

Options:
  --db <url>      Database connection URL (required)
  --tables <list> Comma-separated list of tables (required)
  --output <type> Output format: json, sql (default: json)
  --help          Show this help message

Examples:
  vsequel join --db postgresql://localhost/mydb --tables orders,customers
  vsequel join --db postgresql://localhost/mydb --tables orders,customers,products --output sql
  vsequel join --db mysql://localhost/mydb --tables schema1.table1,schema2.table2`);
};
//# sourceMappingURL=join-command.js.map
