import mysql, { type RowDataPacket } from 'mysql2/promise';
import type {
  ColumnSchema,
  ForeignKey,
  IndexSchema,
  PrimaryKey,
  TableSchema,
} from '../../database/types';
import type {
  DatabaseProvider,
  JoinPath,
  JoinRelation,
  TableReference,
} from '../types';

// MySQL types
interface MySQLTableRow extends RowDataPacket {
  schema_name: string;
  table_name: string;
  table_comment: string | null;
}

interface MySQLColumnRow extends RowDataPacket {
  table_schema: string;
  table_name: string;
  ordinal_position: number;
  column_name: string;
  data_type: string;
  udt_name: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: boolean;
  column_default: string | null;
  column_comment: string | null;
}

interface MySQLPrimaryKeyRow extends RowDataPacket {
  constraint_name: string;
  columns: string | null;
}

interface MySQLForeignKeyRow extends RowDataPacket {
  constraint_name: string;
  columns: string | null;
  foreign_table_schema: string;
  foreign_table_name: string;
  foreign_columns: string | null;
  update_rule: string | null;
  delete_rule: string | null;
}

interface MySQLIndexRow extends RowDataPacket {
  index_name: string;
  is_unique: boolean;
  is_primary: boolean;
  index_def: string;
}

export class MySQLProvider implements DatabaseProvider {
  private readonly databaseUrl: string;

  constructor(databaseUrl: string) {
    this.databaseUrl = databaseUrl;
  }

  async getAllTableNames(): Promise<Array<{ schema: string; table: string }>> {
    const connection = await mysql.createConnection(this.databaseUrl);

    try {
      // Parse database name from URL
      const urlParts = new URL(this.databaseUrl);
      const dbName = urlParts.pathname.slice(1); // Remove leading /

      if (!dbName) {
        throw new Error('Database name not found in MySQL URL');
      }

      const [tables] = await connection.execute<MySQLTableRow[]>(
        `
        SELECT 
          TABLE_SCHEMA as schema_name,
          TABLE_NAME as table_name
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `,
        [dbName]
      );

      return tables.map((t) => ({
        schema: t.schema_name,
        table: t.table_name,
      }));
    } finally {
      await connection.end();
    }
  }

  async getSchema(params: {
    table: string;
    schema?: string;
  }): Promise<TableSchema> {
    const connection = await mysql.createConnection(this.databaseUrl);

    try {
      // Parse database name from URL
      const urlParts = new URL(this.databaseUrl);
      const defaultSchema = urlParts.pathname.slice(1); // Remove leading /

      // Use explicit schema param or default schema from URL
      const schemaToUse = params.schema || defaultSchema;

      if (!schemaToUse) {
        throw new Error('Schema name not found in MySQL URL or params');
      }

      // Get table comment
      const [tableInfo] = await connection.execute<MySQLTableRow[]>(
        `
        SELECT 
          TABLE_SCHEMA as schema_name,
          TABLE_NAME as table_name,
          TABLE_COMMENT as table_comment
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
          AND TABLE_TYPE = 'BASE TABLE'
      `,
        [schemaToUse, params.table]
      );

      if (tableInfo.length === 0) {
        throw new Error(`Table ${schemaToUse}.${params.table} not found`);
      }

      // Run all queries in parallel
      const [columnsResult, pkResult, fkResult, idxResult] = await Promise.all([
        // Columns
        connection.execute<MySQLColumnRow[]>(
          `
          SELECT 
            TABLE_SCHEMA as table_schema,
            TABLE_NAME as table_name,
            ORDINAL_POSITION as ordinal_position,
            COLUMN_NAME as column_name,
            DATA_TYPE as data_type,
            COLUMN_TYPE as udt_name,
            CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
            NUMERIC_PRECISION as numeric_precision,
            NUMERIC_SCALE as numeric_scale,
            IF(IS_NULLABLE = 'YES', true, false) as is_nullable,
            COLUMN_DEFAULT as column_default,
            COLUMN_COMMENT as column_comment
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `,
          [schemaToUse, params.table]
        ),

        // Primary key
        connection.execute<MySQLPrimaryKeyRow[]>(
          `
          SELECT 
            tc.CONSTRAINT_NAME as constraint_name,
            GROUP_CONCAT(kcu.COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) as columns
          FROM information_schema.TABLE_CONSTRAINTS tc
          JOIN information_schema.KEY_COLUMN_USAGE kcu
            ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
            AND tc.TABLE_NAME = kcu.TABLE_NAME
          WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            AND tc.TABLE_SCHEMA = ?
            AND tc.TABLE_NAME = ?
          GROUP BY tc.CONSTRAINT_NAME
        `,
          [schemaToUse, params.table]
        ),

        // Foreign keys
        connection.execute<MySQLForeignKeyRow[]>(
          `
          SELECT 
            tc.CONSTRAINT_NAME as constraint_name,
            GROUP_CONCAT(kcu.COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) as columns,
            kcu.REFERENCED_TABLE_SCHEMA as foreign_table_schema,
            kcu.REFERENCED_TABLE_NAME as foreign_table_name,
            GROUP_CONCAT(kcu.REFERENCED_COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) as foreign_columns,
            rc.UPDATE_RULE as update_rule,
            rc.DELETE_RULE as delete_rule
          FROM information_schema.TABLE_CONSTRAINTS tc
          JOIN information_schema.KEY_COLUMN_USAGE kcu
            ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
            AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
            AND tc.TABLE_NAME = kcu.TABLE_NAME
          JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
            ON rc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
            AND rc.CONSTRAINT_SCHEMA = tc.TABLE_SCHEMA
          WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND tc.TABLE_SCHEMA = ?
            AND tc.TABLE_NAME = ?
          GROUP BY tc.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_SCHEMA, 
                   kcu.REFERENCED_TABLE_NAME, rc.UPDATE_RULE, rc.DELETE_RULE
        `,
          [schemaToUse, params.table]
        ),

        // Indexes
        connection.execute<MySQLIndexRow[]>(
          `
          SELECT 
            INDEX_NAME as index_name,
            IF(NON_UNIQUE = 0, true, false) as is_unique,
            IF(INDEX_NAME = 'PRIMARY', true, false) as is_primary,
            CONCAT('INDEX ', INDEX_NAME, ' ON ', TABLE_NAME, 
                   ' (', GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX), ')') as index_def
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
          GROUP BY INDEX_NAME, NON_UNIQUE, TABLE_NAME
          ORDER BY INDEX_NAME
        `,
          [schemaToUse, params.table]
        ),
      ]);

      const [columns] = columnsResult;
      const [pkRows] = pkResult;
      const [fkRows] = fkResult;
      const [idxRows] = idxResult;

      const columnSchemas: ColumnSchema[] = columns.map((r) => ({
        schema: r.table_schema,
        table: r.table_name,
        name: r.column_name,
        ordinalPosition: Number(r.ordinal_position),
        dataType: r.data_type,
        udtName: r.udt_name ?? null,
        maxLength: r.character_maximum_length ?? null,
        numericPrecision: r.numeric_precision ?? null,
        numericScale: r.numeric_scale ?? null,
        isNullable: !!r.is_nullable,
        default: r.column_default ?? null,
        comment: r.column_comment ?? null,
      }));

      const primaryKey: PrimaryKey | null =
        pkRows.length > 0 && pkRows[0]
          ? {
              name: pkRows[0].constraint_name,
              columns: pkRows[0].columns ? pkRows[0].columns.split(',') : [],
            }
          : null;

      const foreignKeys: ForeignKey[] = fkRows.map((r) => ({
        name: r.constraint_name,
        columns: r.columns ? r.columns.split(',') : [],
        referencedSchema: r.foreign_table_schema,
        referencedTable: r.foreign_table_name,
        referencedColumns: r.foreign_columns
          ? r.foreign_columns.split(',')
          : [],
        onUpdate: r.update_rule ?? null,
        onDelete: r.delete_rule ?? null,
      }));

      const indexes: IndexSchema[] = idxRows.map((r) => ({
        name: r.index_name,
        isUnique: !!r.is_unique,
        isPrimary: !!r.is_primary,
        definition: r.index_def,
      }));

      return {
        schema: schemaToUse,
        name: params.table,
        comment: tableInfo[0]?.table_comment || null,
        columns: columnSchemas,
        primaryKey,
        foreignKeys,
        indexes,
      };
    } finally {
      await connection.end();
    }
  }

  async getAllSchemas(): Promise<TableSchema[]> {
    // Get all table names using the existing method
    const tables = await this.getAllTableNames();

    // Pull schema for each table using the existing getSchema method
    const tablePromises = tables.map(({ schema, table }) =>
      this.getSchema({ table, schema })
    );

    return Promise.all(tablePromises);
  }

  async getSampleData(params: {
    table: string;
    schema?: string;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    const connection = await mysql.createConnection(this.databaseUrl);

    try {
      // Parse default database name from URL
      const urlParts = new URL(this.databaseUrl);
      const defaultSchema = urlParts.pathname.slice(1); // Remove leading /

      // Use explicit schema param or default schema from URL
      const schemaToUse = params.schema || defaultSchema || null;
      const limitToUse = params.limit ?? 10;

      let query: string;
      let queryParams: string[];

      if (schemaToUse) {
        query = `SELECT * FROM \`${schemaToUse}\`.\`${params.table}\` LIMIT ${limitToUse}`;
        queryParams = [];
      } else {
        query = `SELECT * FROM \`${params.table}\` LIMIT ${limitToUse}`;
        queryParams = [];
      }

      const [rows] = await connection.execute<RowDataPacket[]>(
        query,
        queryParams
      );
      return rows as Record<string, unknown>[];
    } finally {
      await connection.end();
    }
  }

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

  private findShortestPath = ({
    start,
    end,
    graph,
  }: {
    start: string;
    end: string;
    graph: Map<string, Set<string>>;
  }): string[] | null => {
    const queue: string[][] = [[start]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const path = queue.shift();
      if (!path) {
        continue;
      }

      const current = path.at(-1);
      if (!current) {
        continue;
      }

      if (current === end) {
        return path;
      }

      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      const neighbors = graph.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push([...path, neighbor]);
        }
      }
    }

    return null;
  };

  private connectTables = ({
    inputTableKeys,
    graph,
    relationDetails,
  }: {
    inputTableKeys: string[];
    graph: Map<string, Set<string>>;
    relationDetails: Map<string, JoinRelation[]>;
  }) => {
    const visitedTables = new Set<string>();
    const pathTables = new Set<string>();
    const usedRelations: JoinRelation[] = [];

    // Start with the first table
    const startTable = inputTableKeys[0];
    if (!startTable) {
      return null;
    }
    pathTables.add(startTable);
    visitedTables.add(startTable);

    // Connect each remaining table
    for (let i = 1; i < inputTableKeys.length; i++) {
      const targetTable = inputTableKeys[i];
      if (!targetTable || visitedTables.has(targetTable)) {
        continue;
      }

      // Find shortest path from any visited table
      const shortestPath = this.findShortestFromVisited({
        visitedTables,
        targetTable,
        graph,
      });

      if (!shortestPath) {
        return null; // Tables not connected
      }

      // Add path tables and relations
      this.addPathToResult({
        path: shortestPath,
        pathTables,
        visitedTables,
        relationDetails,
        usedRelations,
      });
    }

    return { pathTables, usedRelations };
  };

  private findShortestFromVisited = ({
    visitedTables,
    targetTable,
    graph,
  }: {
    visitedTables: Set<string>;
    targetTable: string;
    graph: Map<string, Set<string>>;
  }): string[] | null => {
    let shortestPath: string[] | null = null;
    let shortestLength = Number.POSITIVE_INFINITY;

    for (const visitedTable of visitedTables) {
      const path = this.findShortestPath({
        start: visitedTable,
        end: targetTable,
        graph,
      });
      if (path && path.length < shortestLength) {
        shortestPath = path;
        shortestLength = path.length;
      }
    }

    return shortestPath;
  };

  private addRelation = ({
    fromKey,
    toKey,
    relationDetails,
    usedRelations,
  }: {
    fromKey: string;
    toKey: string;
    relationDetails: Map<string, JoinRelation[]>;
    usedRelations: JoinRelation[];
  }) => {
    const relationKey = `${fromKey}->${toKey}`;
    const relations = relationDetails.get(relationKey);
    if (relations && relations.length > 0) {
      const relation = relations[0];
      if (relation) {
        usedRelations.push(relation);
      }
    }
  };

  private addPathToResult = ({
    path,
    pathTables,
    visitedTables,
    relationDetails,
    usedRelations,
  }: {
    path: string[];
    pathTables: Set<string>;
    visitedTables: Set<string>;
    relationDetails: Map<string, JoinRelation[]>;
    usedRelations: JoinRelation[];
  }) => {
    for (let j = 0; j < path.length; j++) {
      const tableKey = path[j];
      if (!tableKey) {
        continue;
      }

      pathTables.add(tableKey);
      visitedTables.add(tableKey);

      if (j > 0) {
        const fromKey = path[j - 1];
        const toKey = path[j];
        if (fromKey && toKey) {
          this.addRelation({ fromKey, toKey, relationDetails, usedRelations });
        }
      }
    }
  };

  private findShortestJoinPath = async ({
    tables,
  }: {
    tables: TableReference[];
  }): Promise<JoinPath | null> => {
    if (tables.length === 0) {
      return null;
    }

    if (tables.length === 1) {
      return {
        tables,
        relations: [],
        inputTablesCount: 1,
        totalTablesCount: 1,
        totalJoins: 0,
      };
    }

    // Build relationship graph
    const allSchemas = await this.getAllSchemas();
    const { graph, relationDetails, tableKey } = this.buildRelationshipGraph({
      allSchemas,
    });

    // Connect all input tables
    const inputTableKeys = tables.map((t) => tableKey(t.schema, t.table));
    const result = this.connectTables({
      inputTableKeys,
      graph,
      relationDetails,
    });

    if (!result) {
      return null;
    }

    // Convert results to output format
    const resultTables: TableReference[] = Array.from(result.pathTables)
      .map((key) => {
        const parts = key.split('.');
        const schema = parts[0] || '';
        const table = parts[1] || '';
        return { schema, table };
      })
      .filter((t) => t.schema && t.table);

    return {
      tables: resultTables,
      relations: result.usedRelations,
      inputTablesCount: tables.length,
      totalTablesCount: resultTables.length,
      totalJoins: result.usedRelations.length,
    };
  };

  private buildTableIdentifier = (table: TableReference): string => {
    return `${table.schema ? `\`${table.schema}\`.` : ''}\`${table.table}\``;
  };

  private buildSelectColumns = ({
    tables,
    schemas,
  }: {
    tables: TableReference[];
    schemas: TableSchema[];
  }): string[] => {
    const columns: string[] = [];

    tables.forEach((table, index) => {
      const schema = schemas[index];
      if (!(table && schema?.columns)) {
        return;
      }

      const tableAlias = this.buildTableIdentifier(table);
      for (const column of schema.columns) {
        columns.push(`${tableAlias}.\`${column.name}\``);
      }
    });

    return columns;
  };

  private buildJoinCondition = (relation: JoinRelation): string => {
    const fromTable = this.buildTableIdentifier(relation.from);
    const toTable = this.buildTableIdentifier(relation.to);

    return relation.from.columns
      .map((fromCol, idx) => {
        const toCol = relation.to.columns[idx];
        return `${fromTable}.\`${fromCol}\` = ${toTable}.\`${toCol}\``;
      })
      .join(' AND ');
  };

  private generateJoinSQL = ({
    joinPath,
    tableSchemas,
  }: {
    joinPath: JoinPath;
    tableSchemas: TableSchema[];
  }): string => {
    // Build SELECT clause
    const selectColumns = this.buildSelectColumns({
      tables: joinPath.tables,
      schemas: tableSchemas,
    });
    const selectClause = `SELECT\n  ${selectColumns.join(',\n  ')}`;

    // Build FROM clause
    const firstTable = joinPath.tables[0];
    if (!firstTable) {
      return '';
    }
    const fromClause = `FROM ${this.buildTableIdentifier(firstTable)}`;

    // Build JOIN clauses
    const joinStatements = joinPath.relations.map((relation) => {
      const toTable = this.buildTableIdentifier(relation.to);
      const joinCondition = this.buildJoinCondition(relation);
      return `JOIN ${toTable} ON ${joinCondition}`;
    });

    if (joinStatements.length === 0) {
      return `${selectClause}\n${fromClause}`;
    }

    return `${selectClause}\n${fromClause}\n${joinStatements.join('\n')};`;
  };

  getTableJoins = async ({
    tables,
  }: {
    tables: TableReference[];
  }): Promise<{
    joinPath: JoinPath;
    sql: string;
  } | null> => {
    const joinPath = await this.findShortestJoinPath({ tables });

    if (!joinPath) {
      return null;
    }

    // Fetch schemas for all tables to get column names
    const tableSchemas = await Promise.all(
      joinPath.tables.map((table) =>
        this.getSchema({ table: table.table, schema: table.schema })
      )
    );

    return {
      joinPath,
      sql: this.generateJoinSQL({ joinPath, tableSchemas }),
    };
  };
}
