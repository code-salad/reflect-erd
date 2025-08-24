import { DatabaseService } from '../../services/database';

export interface TableCommandOptions {
  db: string;
  table: string;
  schema?: string;
  withSample?: boolean;
}

export const tableCommand = async ({
  db,
  table,
  schema,
  withSample = false,
}: TableCommandOptions): Promise<void> => {
  try {
    const databaseService = DatabaseService.fromUrl(db);
    const tableSchema = await databaseService.getSchema({ table, schema });

    if (withSample) {
      const sampleData = await databaseService.getSampleData({ table, schema });
      console.log(JSON.stringify({ schema: tableSchema, sampleData }, null, 2));
    } else {
      console.log(JSON.stringify(tableSchema, null, 2));
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
};

export const tableHelp = (): void => {
  console.log(`vsequel table - Get schema for a specific table

Options:
  --db <url>        Database connection URL (required)
  --table <name>    Table name (required)
  --schema <name>   Schema name (default: public for PostgreSQL)
  --with-sample     Include sample data
  --help            Show this help message

Examples:
  vsequel table --db postgresql://localhost/mydb --table users
  vsequel table --db postgresql://localhost/mydb --table users --schema public
  vsequel table --db mysql://localhost/mydb --table users --with-sample`);
};
