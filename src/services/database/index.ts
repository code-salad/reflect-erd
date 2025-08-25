import type { DatabaseProvider } from '../database-provider';
import { MySQLProvider, PostgresProvider } from '../database-provider';
import type { JoinPath, TableReference } from '../database-provider/types';
import { generatePlantumlSchema } from '../plantuml/generator';
import type { TableSchema } from './types';

// Re-export types for external use
export type {
  ColumnSchema,
  ForeignKey,
  IndexSchema,
  PrimaryKey,
  TableSchema,
} from './types';

// Main DatabaseService class that uses database providers
export class DatabaseService {
  private provider: DatabaseProvider;
  private providerName: 'postgres' | 'mysql';

  constructor({ provider }: { provider: DatabaseProvider }) {
    this.provider = provider;
    // Detect provider type based on instance
    if (provider instanceof PostgresProvider) {
      this.providerName = 'postgres';
    } else if (provider instanceof MySQLProvider) {
      this.providerName = 'mysql';
    } else {
      // Default fallback, could be extended for custom providers
      this.providerName = 'postgres';
    }
  }

  static fromUrl(databaseUrl: string): DatabaseService {
    const provider = DatabaseService.createProvider(databaseUrl);
    return new DatabaseService({ provider });
  }

  private static createProvider(databaseUrl: string): DatabaseProvider {
    const url = databaseUrl.toLowerCase();

    if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
      return new PostgresProvider(databaseUrl);
    }
    if (url.startsWith('mysql://') || url.startsWith('mysql2://')) {
      return new MySQLProvider(databaseUrl);
    }
    throw new Error(
      `Unsupported database URL: ${databaseUrl}. Supported: postgresql://, postgres://, mysql://, mysql2://`
    );
  }

  getAllTableNames = async (): Promise<
    Array<{ schema: string; table: string }>
  > => {
    return await this.provider.getAllTableNames();
  };

  getSchema = async ({
    table,
    schema,
  }: {
    table: string;
    schema?: string;
  }): Promise<TableSchema> => {
    return await this.provider.getSchema({ table, schema });
  };

  getAllSchemas = async (): Promise<TableSchema[]> => {
    return await this.provider.getAllSchemas();
  };

  getSampleData = async ({
    table,
    schema,
    limit,
  }: {
    table: string;
    schema?: string;
    limit?: number;
  }): Promise<Record<string, unknown>[]> => {
    return await this.provider.getSampleData({ table, schema, limit });
  };

  generatePlantumlSchema = ({
    schema,
  }: {
    schema: TableSchema[];
  }): {
    full: string;
    simplified: string;
  } => {
    return generatePlantumlSchema({ schema });
  };

  getProvider = (): 'postgres' | 'mysql' => {
    return this.providerName;
  };

  getTableContext = async ({
    table,
    schema,
  }: {
    table: string;
    schema?: string;
  }): Promise<{
    schema: TableSchema;
    sampleData: Record<string, unknown>[];
  }> => {
    // this will return table schema and sample data
    const result = await Promise.all([
      this.getSchema({ table, schema }),
      this.getSampleData({ table, schema }),
    ]);
    return { schema: result[0], sampleData: result[1] };
  };

  getTableJoins = async ({
    tables,
  }: {
    tables: TableReference[];
  }): Promise<{
    joinPath: JoinPath;
    sql: string;
  } | null> => {
    return await this.provider.getTableJoins({ tables });
  };
}
