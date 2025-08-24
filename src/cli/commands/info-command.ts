import { DatabaseService } from '../../services/database';

export interface InfoCommandOptions {
  db: string;
}

export const infoCommand = async ({
  db,
}: InfoCommandOptions): Promise<void> => {
  try {
    const databaseService = DatabaseService.fromUrl(db);

    // Get provider type
    const provider = databaseService.getProvider();

    // Get all table names
    const tables = await databaseService.getAllTableNames();

    // Group tables by schema
    const schemaMap = new Map<string, string[]>();
    for (const { schema, table } of tables) {
      if (!schemaMap.has(schema)) {
        schemaMap.set(schema, []);
      }
      schemaMap.get(schema)?.push(table);
    }

    // Convert to object for JSON output
    const schemas: Record<string, { tableCount: number; tables: string[] }> =
      {};
    schemaMap.forEach((tableList, schemaName) => {
      schemas[schemaName] = {
        tableCount: tableList.length,
        tables: tableList.sort(),
      };
    });

    const info = {
      provider,
      tableCount: tables.length,
      schemaCount: schemaMap.size,
      schemas,
    };

    console.log(JSON.stringify(info, null, 2));
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
};

export const infoHelp = (): void => {
  console.log(`vsequel info - Show database connection info

Options:
  --db <url>  Database connection URL (required)
  --help      Show this help message

Examples:
  vsequel info --db postgresql://localhost/mydb
  vsequel info --db mysql://localhost/mydb`);
};
