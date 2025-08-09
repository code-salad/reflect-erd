import type { DatabaseServiceImpl } from './base';
import { MySQLDatabaseService } from './mysql';
import { PostgresDatabaseService } from './postgres';
import type { TableSchema } from './types';

// Re-export types for external use
export type {
  ColumnSchema,
  ForeignKey,
  IndexSchema,
  PrimaryKey,
  TableSchema,
} from './types';

// Main DatabaseService class that automatically detects database type
export class DatabaseService {
  private implementation: DatabaseServiceImpl;

  constructor(options: { databaseUrl: string }) {
    const url = options.databaseUrl.toLowerCase();

    if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
      this.implementation = new PostgresDatabaseService(options);
    } else if (url.startsWith('mysql://') || url.startsWith('mysql2://')) {
      this.implementation = new MySQLDatabaseService(options);
    } else {
      throw new Error(
        `Unsupported database URL: ${options.databaseUrl}. Supported: postgresql://, postgres://, mysql://, mysql2://`
      );
    }
  }

  async pullSchema(): Promise<TableSchema[]> {
    return await this.implementation.pullSchema();
  }

  async pullSampleData(params: {
    table: string;
    schema?: string;
  }): Promise<Record<string, unknown>[]> {
    return await this.implementation.pullSampleData(params);
  }
}
