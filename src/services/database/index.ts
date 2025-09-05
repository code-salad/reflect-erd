import type { DatabaseProvider } from '../database-provider';
import { MySQLProvider, PostgresProvider } from '../database-provider';
import type {
  JoinPath,
  JoinRelation,
  TableReference,
} from '../database-provider/types';
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
  private relationDetails?: Map<string, JoinRelation[]>;

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

  private buildRelationshipGraph = ({
    allSchemas,
  }: {
    allSchemas: TableSchema[];
  }) => {
    const graph = new Map<string, Set<string>>();
    const relationDetails = new Map<string, JoinRelation[]>();
    const tableKey = (schema: string, table: string) => `${schema}.${table}`;

    for (const tableSchema of allSchemas) {
      const fromKey = tableKey(tableSchema.schema, tableSchema.name);

      if (!graph.has(fromKey)) {
        graph.set(fromKey, new Set());
      }

      for (const fk of tableSchema.foreignKeys) {
        const toKey = tableKey(fk.referencedSchema, fk.referencedTable);

        // Add bidirectional edges
        graph.get(fromKey)?.add(toKey);
        if (!graph.has(toKey)) {
          graph.set(toKey, new Set());
        }
        graph.get(toKey)?.add(fromKey);

        // Store relation details
        const relationKey = `${fromKey}->${toKey}`;
        const reverseRelationKey = `${toKey}->${fromKey}`;

        // Check if FK columns are nullable
        const fkColumns = tableSchema.columns.filter((col) =>
          fk.columns.includes(col.name)
        );
        const isNullable = fkColumns.some((col) => col.isNullable);

        const relation: JoinRelation = {
          from: {
            schema: tableSchema.schema,
            table: tableSchema.name,
            columns: fk.columns,
          },
          to: {
            schema: fk.referencedSchema,
            table: fk.referencedTable,
            columns: fk.referencedColumns,
          },
          isNullable,
        };

        // Store both directions
        if (!relationDetails.has(relationKey)) {
          relationDetails.set(relationKey, []);
        }
        relationDetails.get(relationKey)?.push(relation);

        // Store reverse relation
        const reverseRelation: JoinRelation = {
          from: {
            schema: fk.referencedSchema,
            table: fk.referencedTable,
            columns: fk.referencedColumns,
          },
          to: {
            schema: tableSchema.schema,
            table: tableSchema.name,
            columns: fk.columns,
          },
          isNullable: false, // Reverse direction is typically not nullable
        };

        if (!relationDetails.has(reverseRelationKey)) {
          relationDetails.set(reverseRelationKey, []);
        }
        relationDetails.get(reverseRelationKey)?.push(reverseRelation);
      }
    }

    return { graph, relationDetails, tableKey };
  };

  private findAllPathsBetweenTables = ({
    inputTableKeys,
    graph,
    relationDetails,
    maxDepth,
  }: {
    inputTableKeys: string[];
    graph: Map<string, Set<string>>;
    relationDetails: Map<string, JoinRelation[]>;
    maxDepth: number;
  }): Array<{ pathTables: Set<string>; usedRelations: JoinRelation[] }> => {
    const allValidPaths: Array<{
      pathTables: Set<string>;
      usedRelations: JoinRelation[];
    }> = [];

    // For multiple tables, find all ways to connect them
    const findAllConnections = (
      currentConnected: Set<string>,
      remainingTables: string[],
      currentPath: Set<string>,
      currentRelations: JoinRelation[],
      depth: number
    ) => {
      if (remainingTables.length === 0) {
        // All input tables connected, this is a valid path
        allValidPaths.push({
          pathTables: new Set(currentPath),
          usedRelations: [...currentRelations],
        });
        return;
      }

      if (depth >= maxDepth) {
        return; // Prevent infinite exploration
      }

      // Try to connect the next remaining table
      const nextTable = remainingTables[0];
      if (!nextTable) {
        return;
      }

      const restOfTables = remainingTables.slice(1);

      // Find all possible paths from any connected table to this target
      const pathsToTarget = this.findAllPathsFromSetToTarget({
        connectedTables: currentConnected,
        targetTable: nextTable,
        graph,
        relationDetails,
        maxDepth: maxDepth - depth,
        visited: currentPath,
      });

      for (const pathResult of pathsToTarget) {
        const newConnected = new Set([
          ...currentConnected,
          ...pathResult.pathTables,
        ]);
        const newPath = new Set([...currentPath, ...pathResult.pathTables]);
        const newRelations = [...currentRelations, ...pathResult.usedRelations];

        findAllConnections(
          newConnected,
          restOfTables,
          newPath,
          newRelations,
          depth + pathResult.usedRelations.length
        );
      }
    };

    // Start with first table
    const startTable = inputTableKeys[0];
    if (!startTable) {
      return [];
    }

    findAllConnections(
      new Set([startTable]),
      inputTableKeys.slice(1),
      new Set([startTable]),
      [],
      0
    );

    // Remove duplicate paths (same tables, same relations)
    const uniquePaths = this.deduplicatePaths(allValidPaths);

    return uniquePaths;
  };

  private findAllPathsFromSetToTarget = ({
    connectedTables,
    targetTable,
    graph,
    relationDetails,
    maxDepth,
    visited,
  }: {
    connectedTables: Set<string>;
    targetTable: string;
    graph: Map<string, Set<string>>;
    relationDetails: Map<string, JoinRelation[]>;
    maxDepth: number;
    visited: Set<string>;
  }): Array<{ pathTables: Set<string>; usedRelations: JoinRelation[] }> => {
    const allPaths: Array<{
      pathTables: Set<string>;
      usedRelations: JoinRelation[];
    }> = [];

    for (const startTable of connectedTables) {
      const paths = this.findAllPathsFromSource({
        start: startTable,
        target: targetTable,
        graph,
        relationDetails,
        maxDepth,
        visited,
      });
      allPaths.push(...paths);
    }

    return allPaths;
  };

  private findAllPathsFromSource = ({
    start,
    target,
    graph,
    relationDetails,
    maxDepth,
    visited,
  }: {
    start: string;
    target: string;
    graph: Map<string, Set<string>>;
    relationDetails: Map<string, JoinRelation[]>;
    maxDepth: number;
    visited: Set<string>;
  }): Array<{ pathTables: Set<string>; usedRelations: JoinRelation[] }> => {
    const allPaths: Array<{
      pathTables: Set<string>;
      usedRelations: JoinRelation[];
    }> = [];

    // Store relationDetails for access in nested function
    this.relationDetails = relationDetails;

    this.dfsPathSearch({
      currentPath: [start],
      currentVisited: new Set([start]),
      target,
      graph,
      visited,
      maxDepth,
      depth: 0,
      allPaths,
    });

    return allPaths;
  };

  private dfsPathSearch = ({
    currentPath,
    currentVisited,
    target,
    graph,
    visited,
    maxDepth,
    depth,
    allPaths,
  }: {
    currentPath: string[];
    currentVisited: Set<string>;
    target: string;
    graph: Map<string, Set<string>>;
    visited: Set<string>;
    maxDepth: number;
    depth: number;
    allPaths: Array<{ pathTables: Set<string>; usedRelations: JoinRelation[] }>;
  }) => {
    if (depth > maxDepth) {
      return;
    }

    const current = currentPath.at(-1);
    if (!current) {
      return;
    }

    if (current === target && currentPath.length > 1) {
      // Found a path, extract relations
      const pathTables = new Set(currentPath);
      const relations = this.extractRelationsFromPath(currentPath);
      allPaths.push({ pathTables, usedRelations: relations });
      return;
    }

    const neighbors = graph.get(current) || new Set();
    for (const neighbor of neighbors) {
      if (!(currentVisited.has(neighbor) || visited.has(neighbor))) {
        const newPath = [...currentPath, neighbor];
        const newVisited = new Set([...currentVisited, neighbor]);
        this.dfsPathSearch({
          currentPath: newPath,
          currentVisited: newVisited,
          target,
          graph,
          visited,
          maxDepth,
          depth: depth + 1,
          allPaths,
        });
      }
    }
  };

  private extractRelationsFromPath = (path: string[]): JoinRelation[] => {
    const relations: JoinRelation[] = [];

    for (let i = 1; i < path.length; i++) {
      const from = path[i - 1];
      const to = path[i];
      if (from && to) {
        const relationKey = `${from}->${to}`;
        const relationList = this.relationDetails?.get(relationKey);
        if (relationList?.[0]) {
          relations.push(relationList[0]);
        }
      }
    }

    return relations;
  };

  private deduplicatePaths = (
    paths: Array<{ pathTables: Set<string>; usedRelations: JoinRelation[] }>
  ): Array<{ pathTables: Set<string>; usedRelations: JoinRelation[] }> => {
    const seen = new Set<string>();
    const unique: Array<{
      pathTables: Set<string>;
      usedRelations: JoinRelation[];
    }> = [];

    for (const path of paths) {
      // Create signature from tables and relations
      const tablesSig = Array.from(path.pathTables).sort().join(',');
      const relationsSig = path.usedRelations
        .map(
          (r) =>
            `${r.from.schema}.${r.from.table}:${r.from.columns.join(',')}→${r.to.schema}.${r.to.table}:${r.to.columns.join(',')}`
        )
        .sort()
        .join('|');
      const signature = `${tablesSig}::${relationsSig}`;

      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(path);
      }
    }

    return unique;
  };

  private findAllJoinPaths = async ({
    tables,
  }: {
    tables: TableReference[];
  }): Promise<JoinPath[]> => {
    if (tables.length === 0) {
      return [];
    }

    if (tables.length === 1) {
      return [
        {
          tables,
          relations: [],
          inputTablesCount: 1,
          totalTablesCount: 1,
          totalJoins: 0,
        },
      ];
    }

    // Build relationship graph
    const allSchemas = await this.getAllSchemas();
    const { graph, tableKey, relationDetails } = this.buildRelationshipGraph({
      allSchemas,
    });

    const inputTableKeys = tables.map((t) => tableKey(t.schema, t.table));
    const allPaths = this.findAllPathsBetweenTables({
      inputTableKeys,
      graph,
      relationDetails,
      maxDepth: 6, // Limit maximum join depth
    });

    // Convert results to output format
    return allPaths
      .map((path) => {
        const resultTables: TableReference[] = Array.from(path.pathTables)
          .map((key) => {
            const parts = key.split('.');
            const schema = parts[0] || '';
            const table = parts[1] || '';
            return { schema, table };
          })
          .filter((t) => t.schema && t.table);

        return {
          tables: resultTables,
          relations: path.usedRelations,
          inputTablesCount: tables.length,
          totalTablesCount: resultTables.length,
          totalJoins: path.usedRelations.length,
        };
      })
      .sort((a, b) => a.totalJoins - b.totalJoins); // Sort by number of joins (shortest first)
  };

  getTableJoins = async ({
    tables,
  }: {
    tables: TableReference[];
  }): Promise<
    | {
        joinPath: JoinPath;
        sql: string;
      }[]
    | null
  > => {
    const joinPaths = await this.findAllJoinPaths({ tables });

    if (!joinPaths || joinPaths.length === 0) {
      return null;
    }

    // Generate SQL for each join path using provider-specific SQL generation
    const results = await Promise.all(
      joinPaths.map(async (joinPath) => {
        // Fetch schemas for all tables to get column names
        const tableSchemas = await Promise.all(
          joinPath.tables.map((table) =>
            this.getSchema({ table: table.table, schema: table.schema })
          )
        );

        return {
          joinPath,
          sql: this.provider.generateJoinSQL({ joinPath, tableSchemas }),
        };
      })
    );

    return results;
  };
}
