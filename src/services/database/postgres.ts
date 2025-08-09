import postgres from 'postgres';
import { DatabaseServiceImpl } from './base';
import type {
  ColumnSchema,
  ForeignKey,
  IndexSchema,
  PrimaryKey,
  TableSchema,
} from './types';

export class PostgresDatabaseService extends DatabaseServiceImpl {
  async pullSchema(): Promise<TableSchema[]> {
    const sql = postgres(this.databaseUrl);
    try {
      // 1) Get all regular tables
      const tables = await sql<
        {
          schema_name: string;
          table_name: string;
          table_comment: string | null;
        }[]
      > /*sql*/`
        select
          n.nspname as schema_name,
          c.relname as table_name,
          obj_description(c.oid, 'pg_class') as table_comment
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

      const tablePromises = tables.map(async (t) => {
        const schema = t.schema_name;
        const table = t.table_name;

        // Run all queries in parallel for each table
        const [columns, pkRows, fkRows, idxRows] = await Promise.all([
          // 2) Columns
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
            where c.table_schema = ${schema}
              and c.table_name = ${table}
            order by c.ordinal_position;
          `,

          // 3) Primary key
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
              and tc.table_schema = ${schema}
              and tc.table_name = ${table}
            group by tc.constraint_name;
          `,

          // 4) Foreign keys
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
              and tc.table_schema = ${schema}
              and tc.table_name = ${table}
            group by tc.constraint_name, ccu.table_schema, ccu.table_name, rc.update_rule, rc.delete_rule
            order by tc.constraint_name;
          `,

          // 5) Indexes
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
            where n.nspname = ${schema}
              and c.relname = ${table}
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
          schema,
          name: table,
          comment: t.table_comment,
          columns: columnSchemas,
          primaryKey,
          foreignKeys,
          indexes,
        };
      });

      const results = await Promise.all(tablePromises);
      return results;
    } finally {
      await sql.end();
    }
  }

  async pullSampleData(params: {
    table: string;
  }): Promise<Record<string, unknown>[]> {
    const sql = postgres(this.databaseUrl);
    try {
      const [schema, tableName] = params.table.includes('.')
        ? params.table.split('.')
        : ['public', params.table];

      const result = await sql.unsafe<Record<string, unknown>[]>(
        `SELECT * FROM "${schema}"."${tableName}" LIMIT 10`
      );

      return result;
    } finally {
      await sql.end();
    }
  }
}
