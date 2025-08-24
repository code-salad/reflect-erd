import { DatabaseService } from '../../services/database';
import type { TableReference } from '../../services/database-provider/types';

export interface JoinCommandOptions {
  db: string;
  tables: string;
  output?: 'json' | 'sql';
}

export const joinCommand = async ({
  db,
  tables,
  output = 'json',
}: JoinCommandOptions): Promise<void> => {
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
    }) as TableReference[];

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
      console.log(JSON.stringify(result.joinPath[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
};

export const joinHelp = (): void => {
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
