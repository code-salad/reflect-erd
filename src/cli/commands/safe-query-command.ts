import { DatabaseService } from '../../services/database';

export interface SafeQueryCommandOptions {
  db: string;
  sql: string;
}

export const safeQueryCommand = async ({
  db,
  sql,
}: SafeQueryCommandOptions): Promise<void> => {
  try {
    const databaseService = DatabaseService.fromUrl(db);
    const result = await databaseService.safeQuery({ sql });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
};

export const safeQueryHelp = (): void => {
  console.log(`vsequel safe-query - Execute SQL query safely in read-only transaction

Options:
  --db <url>     Database connection URL (required)
  --sql <query>  SQL query to execute (required)
  --help         Show this help message

Description:
  Executes SQL queries in a read-only transaction that is automatically rolled back.
  This ensures no data is modified, making it safe to run any SQL statement including
  INSERT, UPDATE, DELETE operations. Perfect for testing queries or exploring data.

Examples:
  vsequel safe-query --db postgresql://localhost/mydb --sql "SELECT * FROM users LIMIT 5"
  vsequel safe-query --db mysql://localhost/mydb --sql "UPDATE users SET name = 'test' WHERE id = 1"
  vsequel safe-query --db postgresql://localhost/mydb --sql "INSERT INTO products (name) VALUES ('test')"

Note: All operations are rolled back automatically - no data will be permanently modified.`);
};
