import { command, number, option, optional, string } from 'cmd-ts';
import { DatabaseService } from '../../services/database';
import { dbOption, handleCliError } from '../utils';

export const sampleCommand = command({
  name: 'sample',
  description: `Extract sample data rows from a specific table.
  
  This command retrieves actual data from a table to help understand data patterns,
  content structure, and data quality. Useful for data analysis and documentation.
  
  Examples:
    vsequel sample --db postgresql://localhost/mydb --table users
    vsequel sample --db mysql://localhost/mydb --table products --limit 10
    vsequel sample --db postgresql://localhost/mydb --table orders --schema public --limit 5`,
  args: {
    db: dbOption,
    table: option({
      type: string,
      long: 'table',
      short: 't',
      description:
        'Table name to sample data from. Must be an existing table with read permissions.',
    }),
    schema: option({
      type: optional(string),
      long: 'schema',
      short: 's',
      description: `Database schema name (optional). Defaults to 'public' for PostgreSQL.
        Specify when the table exists in a non-default schema.`,
    }),
    limit: option({
      type: optional(number),
      long: 'limit',
      short: 'l',
      description: `Maximum number of rows to retrieve (optional). 
        If not specified, uses database default limit. Recommended for large tables.`,
    }),
  },
  handler: async ({ db, table, schema, limit }): Promise<void> => {
    try {
      const databaseService = DatabaseService.fromUrl(db);
      const sampleData = await databaseService.getSampleData({
        table,
        schema,
        limit,
      });

      console.log(JSON.stringify(sampleData, null, 2));
    } catch (error) {
      handleCliError(error);
    }
  },
});
