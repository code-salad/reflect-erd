import { DatabaseService } from '../../services/database';

export interface SampleCommandOptions {
  db: string;
  table: string;
  schema?: string;
  limit?: number;
}

export const sampleCommand = async ({
  db,
  table,
  schema,
  limit = 10,
}: SampleCommandOptions): Promise<void> => {
  try {
    const databaseService = DatabaseService.fromUrl(db);
    const sampleData = await databaseService.getSampleData({ table, schema });

    // Apply limit
    const limitedData = sampleData.slice(0, limit);

    console.log(JSON.stringify(limitedData, null, 2));
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
};

export const sampleHelp = (): void => {
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
