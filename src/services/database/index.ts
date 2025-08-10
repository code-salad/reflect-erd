import type { Provider } from './base-provider';
import { MySQLDatabaseService } from './mysql';
import { generatePlantumlSchema } from './plantuml-generator';
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
  private provider: Provider;

  constructor(options: { databaseUrl: string }) {
    const url = options.databaseUrl.toLowerCase();

    // auto detect provider
    if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
      this.provider = new PostgresDatabaseService(options);
    } else if (url.startsWith('mysql://') || url.startsWith('mysql2://')) {
      this.provider = new MySQLDatabaseService(options);
    } else {
      throw new Error(
        `Unsupported database URL: ${options.databaseUrl}. Supported: postgresql://, postgres://, mysql://, mysql2://`
      );
    }
  }

  async pullSchema(): Promise<TableSchema[]> {
    return await this.provider.pullSchema();
  }

  async pullSampleData(params: {
    table: string;
    schema?: string;
  }): Promise<Record<string, unknown>[]> {
    return await this.provider.pullSampleData(params);
  }

  generatePlantumlSchema(schema: TableSchema[]): {
    full: string;
    simplified: string;
  } {
    return generatePlantumlSchema(schema);
  }
}
