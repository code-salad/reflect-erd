import type { TableSchema } from './types';

export abstract class DatabaseServiceImpl {
  protected databaseUrl: string;

  constructor(options: { databaseUrl: string }) {
    this.databaseUrl = options.databaseUrl;
  }

  abstract pullSchema(): Promise<TableSchema[]>;
}
