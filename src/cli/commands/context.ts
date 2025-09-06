import { command, option, optional, string } from 'cmd-ts';
import { DatabaseService } from '../../services/database';
import { dbOption, handleCliError } from '../utils';

export const contextCommand = command({
  name: 'context',
  description: `Get comprehensive table context including schema definition and sample data.
  
  This command combines table schema analysis with sample data extraction to provide
  a complete picture of table structure and content. Perfect for understanding a table's
  purpose, data patterns, and relationships in one command.
  
  Examples:
    vsequel context --db postgresql://localhost/mydb --table users
    vsequel context --db mysql://localhost/mydb --table products --schema inventory
    vsequel context --db postgresql://localhost/mydb --table orders > orders-context.json`,
  args: {
    db: dbOption,
    table: option({
      type: string,
      long: 'table',
      short: 't',
      description: `Table name to analyze. The command will extract both schema structure 
        and representative sample data to provide full context.`,
    }),
    schema: option({
      type: optional(string),
      long: 'schema',
      short: 's',
      description: `Database schema name (optional). Defaults to 'public' for PostgreSQL.
        Required for MySQL databases with non-default schema organization.`,
    }),
  },
  handler: async ({ db, table, schema }): Promise<void> => {
    try {
      const databaseService = DatabaseService.fromUrl(db);
      const context = await databaseService.getTableContext({ table, schema });

      console.log(JSON.stringify(context, null, 2));
    } catch (error) {
      handleCliError(error);
    }
  },
});
