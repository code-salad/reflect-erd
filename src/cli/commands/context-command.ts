import { DatabaseService } from '../../services/database';

export interface ContextCommandOptions {
  db: string;
  table: string;
  schema?: string;
}

export const contextCommand = async ({
  db,
  table,
  schema,
}: ContextCommandOptions): Promise<void> => {
  try {
    const databaseService = DatabaseService.fromUrl(db);
    const context = await databaseService.getTableContext({ table, schema });

    console.log(JSON.stringify(context, null, 2));
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
};

export const contextHelp = (): void => {
  console.log(`vsequel context - Get schema and sample data for a table

Options:
  --db <url>        Database connection URL (required)
  --table <name>    Table name (required)
  --schema <name>   Schema name (default: public for PostgreSQL)
  --help            Show this help message

Examples:
  vsequel context --db postgresql://localhost/mydb --table users
  vsequel context --db postgresql://localhost/mydb --table users --schema public
  vsequel context --db mysql://localhost/mydb --table users`);
};
