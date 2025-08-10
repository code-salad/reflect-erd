import type { TableSchema } from './types';

export abstract class Provider {
  protected databaseUrl: string;

  constructor(options: { databaseUrl: string }) {
    this.databaseUrl = options.databaseUrl;
  }

  abstract pullSchema(): Promise<TableSchema[]>;

  abstract pullSampleData(params: {
    table: string;
    schema?: string;
  }): Promise<Record<string, unknown>[]>;
}
