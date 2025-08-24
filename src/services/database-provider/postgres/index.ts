import postgres from 'postgres';
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

export class PostgresProvider implements DatabaseProvider {
  private readonly databaseUrl: string;

  constructor(databaseUrl: string) {
    this.databaseUrl = databaseUrl;
  }

  async getAllTableNames(): Promise<Array<{ schema: string; table: string }>> {
    const sql = postgres(this.databaseUrl);
    try {
      const tables = await sql<
        {
          schema_name: string;
          table_name: string;
        }[]
      > /*sql*/`
        select
          n.nspname as schema_name,
          c.relname as table_name
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where c.relkind in ('r', 'p')
          and n.nspname not in (
            'pg_catalog',
            'information_schema',
            'pglogical_origin',
            'pglogical',
            'pg_temp_1',
            'pg_toast'
          )
          and n.nspname not like 'pg_toast_temp%'
          and n.nspname not like 'pg_temp%'
          and n.nspname not like 'pg_toast%'
        order by n.nspname, c.relname;
      `;

      return tables.map((t) => ({
        schema: t.schema_name,
        table: t.table_name,
      }));
    } finally {
      await sql.end();
    }
  }

  async getSchema(params: {
    table: string;
    schema?: string;
  }): Promise<TableSchema> {
    const sql = postgres(this.databaseUrl);
    try {
      // Parse schema from URL parameters (e.g., ?schema=myschema or ?search_path=myschema)
      const urlParts = new URL(this.databaseUrl);
      const urlSchema = urlParts.searchParams.get('schema');

      // Use explicit schema param or schema from URL or default to 'public'
      const schemaToUse = params.schema || urlSchema || 'public';

      // Get table comment
      const tableInfo = await sql<
        {
          table_comment: string | null;
        }[]
      > /*sql*/`
        select
          obj_description(c.oid, 'pg_class') as table_comment
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = ${schemaToUse}
          and c.relname = ${params.table};
      `;

      // Run all queries in parallel
      const [columns, pkRows, fkRows, idxRows] = await Promise.all([
        // Columns
        sql<
          {
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
          }[]
        > /*sql*/`
          select
            c.table_schema,
            c.table_name,
            c.ordinal_position,
            c.column_name,
            c.data_type,
            c.udt_name,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            (c.is_nullable = 'YES') as is_nullable,
            c.column_default,
            pgd.description as column_comment
          from information_schema.columns c
          left join pg_catalog.pg_class pc
            on pc.relname = c.table_name
          left join pg_catalog.pg_namespace pn
            on pn.oid = pc.relnamespace and pn.nspname = c.table_schema
          left join pg_catalog.pg_attribute pa
            on pa.attrelid = pc.oid and pa.attname = c.column_name
          left join pg_catalog.pg_description pgd
            on pgd.objoid = pc.oid and pgd.objsubid = pa.attnum
          where c.table_schema = ${schemaToUse}
            and c.table_name = ${params.table}
          order by c.ordinal_position;
        `,

        // Primary key
        sql<
          {
            constraint_name: string;
            columns: string[];
          }[]
        > /*sql*/`
          select
            tc.constraint_name,
            array_agg(kcu.column_name order by kcu.ordinal_position) as columns
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            using (constraint_name, table_schema, table_name)
          where tc.constraint_type = 'PRIMARY KEY'
            and tc.table_schema = ${schemaToUse}
            and tc.table_name = ${params.table}
          group by tc.constraint_name;
        `,

        // Foreign keys
        sql<
          {
            constraint_name: string;
            columns: string[];
            foreign_table_schema: string;
            foreign_table_name: string;
            foreign_columns: string[];
            update_rule: string | null;
            delete_rule: string | null;
          }[]
        > /*sql*/`
          select
            tc.constraint_name,
            array_agg(kcu.column_name order by kcu.ordinal_position) as columns,
            ccu.table_schema  as foreign_table_schema,
            ccu.table_name    as foreign_table_name,
            array_agg(ccu.column_name order by kcu.ordinal_position) as foreign_columns,
            rc.update_rule,
            rc.delete_rule
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            using (constraint_name, table_schema, table_name)
          join information_schema.referential_constraints rc
            on rc.constraint_name = tc.constraint_name
           and rc.constraint_schema = tc.constraint_schema
          join information_schema.constraint_column_usage ccu
            on ccu.constraint_name = tc.constraint_name
           and ccu.constraint_schema = tc.constraint_schema
          where tc.constraint_type = 'FOREIGN KEY'
            and tc.table_schema = ${schemaToUse}
            and tc.table_name = ${params.table}
          group by tc.constraint_name, ccu.table_schema, ccu.table_name, rc.update_rule, rc.delete_rule
          order by tc.constraint_name;
        `,

        // Indexes
        sql<
          {
            index_name: string;
            is_unique: boolean;
            is_primary: boolean;
            index_def: string;
          }[]
        > /*sql*/`
          select
            i.relname as index_name,
            ix.indisunique as is_unique,
            ix.indisprimary as is_primary,
            pg_get_indexdef(ix.indexrelid) as index_def
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          join pg_index ix on ix.indrelid = c.oid
          join pg_class i on i.oid = ix.indexrelid
          where n.nspname = ${schemaToUse}
            and c.relname = ${params.table}
          order by i.relname;
        `,
      ]);

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
          ? { name: pkRows[0].constraint_name, columns: pkRows[0].columns }
          : null;

      const foreignKeys: ForeignKey[] = fkRows.map((r) => ({
        name: r.constraint_name,
        columns: r.columns,
        referencedSchema: r.foreign_table_schema,
        referencedTable: r.foreign_table_name,
        referencedColumns: r.foreign_columns,
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
        comment: tableInfo[0]?.table_comment ?? null,
        columns: columnSchemas,
        primaryKey,
        foreignKeys,
        indexes,
      };
    } finally {
      await sql.end();
    }
  }

  async getAllSchemas(): Promise<TableSchema[]> {
    // Get all table names using the existing method
    const tables = await this.getAllTableNames();

    // Pull schema for each table using the existing getSchema method
    const tablePromises = tables.map(({ schema, table }) =>
      this.getSchema({ table, schema })
    );

    const results = await Promise.all(tablePromises);
    return results;
  }

  async getSampleData(params: {
    table: string;
    schema?: string;
  }): Promise<Record<string, unknown>[]> {
    const sql = postgres(this.databaseUrl);
    try {
      // Parse schema from URL parameters (e.g., ?schema=myschema or ?search_path=myschema)
      const urlParts = new URL(this.databaseUrl);
      const urlSchema = urlParts.searchParams.get('schema');

      // Use explicit schema param or schema from URL or default to 'public'
      const schemaToUse = params.schema || urlSchema || 'public';

      const result = await sql.unsafe<Record<string, unknown>[]>(
        `SELECT * FROM "${schemaToUse}"."${params.table}" LIMIT 10`
      );

      return result;
    } finally {
      await sql.end();
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
    return `${table.schema ? `"${table.schema}".` : ''}"${table.table}"`;
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
        columns.push(`${tableAlias}."${column.name}"`);
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
        return `${fromTable}."${fromCol}" = ${toTable}."${toCol}"`;
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

    return `${selectClause}\n${fromClause}\n${joinStatements.join('\n')}`;
  };

  getTableJoins = async ({
    tables,
  }: {
    tables: TableReference[];
  }): Promise<{
    joinPath: JoinPath[];
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
      joinPath: [joinPath],
      sql: this.generateJoinSQL({ joinPath, tableSchemas }),
    };
  };
}
