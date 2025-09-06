import { command, flag, option, optional, string } from 'cmd-ts';
import { DatabaseService } from '../../services/database';
import { dbOption, handleCliError } from '../utils';

export const tableCommand = command({
  name: 'table',
  description: `Get detailed schema information for a specific table.
  
  This command provides comprehensive details about a single table including columns,
  data types, constraints, indexes, foreign keys, and optionally sample data.
  
  Examples:
    vsequel table --db postgresql://localhost/mydb --table users
    vsequel table --db mysql://localhost/mydb --table products --schema inventory
    vsequel table --db postgresql://localhost/mydb --table orders --with-sample`,
  args: {
    db: dbOption,
    table: option({
      type: string,
      long: 'table',
      short: 't',
      description:
        'Target table name to analyze. Use the exact table name as it appears in the database.',
    }),
    schema: option({
      type: optional(string),
      long: 'schema',
      short: 's',
      description: `Database schema name (optional). Defaults to 'public' for PostgreSQL.
        Required for MySQL when tables exist in non-default schemas.`,
    }),
    withSample: flag({
      long: 'with-sample',
      description: `Include sample data rows from the table along with schema information.
        Useful for understanding data structure and content patterns.`,
    }),
  },
  handler: async ({ db, table, schema, withSample = false }): Promise<void> => {
    try {
      const databaseService = DatabaseService.fromUrl(db);
      const tableSchema = await databaseService.getSchema({ table, schema });

      if (withSample) {
        const sampleData = await databaseService.getSampleData({
          table,
          schema,
        });
        console.log(
          JSON.stringify({ schema: tableSchema, sampleData }, null, 2)
        );
      } else {
        console.log(JSON.stringify(tableSchema, null, 2));
      }
    } catch (error) {
      handleCliError(error);
    }
  },
});
