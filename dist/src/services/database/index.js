import { MySQLProvider, PostgresProvider } from '../database-provider';
import { generatePlantumlSchema } from '../plantuml/generator';
// Main DatabaseService class that uses database providers
export class DatabaseService {
  provider;
  providerName;
  constructor({ provider }) {
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
  static fromUrl(databaseUrl) {
    const provider = DatabaseService.createProvider(databaseUrl);
    return new DatabaseService({ provider });
  }
  static createProvider(databaseUrl) {
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
  getAllTableNames = async () => {
    return await this.provider.getAllTableNames();
  };
  getSchema = async ({ table, schema }) => {
    return await this.provider.getSchema({ table, schema });
  };
  getAllSchemas = async () => {
    return await this.provider.getAllSchemas();
  };
  getSampleData = async ({ table, schema, limit }) => {
    return await this.provider.getSampleData({ table, schema, limit });
  };
  generatePlantumlSchema = ({ schema }) => {
    return generatePlantumlSchema({ schema });
  };
  getProvider = () => {
    return this.providerName;
  };
  getTableContext = async ({ table, schema }) => {
    // this will return table schema and sample data
    const result = await Promise.all([
      this.getSchema({ table, schema }),
      this.getSampleData({ table, schema }),
    ]);
    return { schema: result[0], sampleData: result[1] };
  };
  getTableJoins = async ({ tables }) => {
    return await this.provider.getTableJoins({ tables });
  };
}
//# sourceMappingURL=index.js.map
