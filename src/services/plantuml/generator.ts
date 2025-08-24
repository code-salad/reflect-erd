import type {
  ColumnSchema,
  ForeignKey,
  IndexSchema,
  TableSchema,
} from '../database/types';

const SPECIAL_CHAR_REGEX = /[^a-zA-Z0-9_]/;

const escapeName = ({ name }: { name: string }): string => {
  if (SPECIAL_CHAR_REGEX.test(name)) {
    return `"${name}"`;
  }
  return name;
};

const mapDataType = ({ dataType }: { dataType: string }): string => {
  const typeMap: Record<string, string> = {
    text: 'STRING',
    'character varying': 'VARCHAR',
    varchar: 'VARCHAR',
    char: 'CHAR',
    integer: 'INT',
    int: 'INT',
    bigint: 'BIGINT',
    smallint: 'SMALLINT',
    tinyint: 'TINYINT',
    boolean: 'BOOL',
    bool: 'BOOL',
    'timestamp without time zone': 'TIMESTAMP',
    'timestamp with time zone': 'TIMESTAMPTZ',
    timestamp: 'TIMESTAMP',
    datetime: 'DATETIME',
    jsonb: 'JSONB',
    json: 'JSON',
    ARRAY: 'ARRAY',
    'USER-DEFINED': 'ENUM',
    uuid: 'UUID',
    date: 'DATE',
    time: 'TIME',
    numeric: 'DECIMAL',
    decimal: 'DECIMAL',
    real: 'FLOAT',
    float: 'FLOAT',
    'double precision': 'DOUBLE',
    double: 'DOUBLE',
    blob: 'BLOB',
    mediumblob: 'BLOB',
    longblob: 'BLOB',
    clob: 'CLOB',
    mediumtext: 'TEXT',
    longtext: 'TEXT',
  };
  return typeMap[dataType.toLowerCase()] || dataType.toUpperCase();
};

const getFullTableName = ({ table }: { table: TableSchema }): string => {
  return table.schema !== 'public'
    ? `${table.schema}.${table.name}`
    : table.name;
};

const generatePrimaryKeyColumns = ({
  table,
}: {
  table: TableSchema;
}): string => {
  let result = '';
  if (!table.primaryKey) {
    return result;
  }

  for (const pkCol of table.primaryKey.columns) {
    const column = table.columns.find(
      (col: ColumnSchema) => col.name === pkCol
    );
    if (column) {
      result += `  * **${column.name}** : ${mapDataType({ dataType: column.dataType })} <<PK>>`;
      if (column.comment) {
        result += ` -- ${column.comment}`;
      }
      result += '\n';
    }
  }
  if (result) {
    result += '  --\n';
  }
  return result;
};

const generateRegularColumns = ({ table }: { table: TableSchema }): string => {
  let result = '';
  for (const column of table.columns) {
    if (table.primaryKey?.columns.includes(column.name)) {
      continue;
    }

    const nullable = column.isNullable ? '  ' : '  * ';
    result += `${nullable}${column.name} : ${mapDataType({ dataType: column.dataType })}`;

    const notes = getColumnNotes({ column, table });
    if (notes.length > 0) {
      result += ` ${notes.join(' ')}`;
    }

    if (column.comment) {
      result += ` -- ${column.comment}`;
    }
    result += '\n';
  }
  return result;
};

const generateTableEntity = ({ table }: { table: TableSchema }): string => {
  const fullTableName = getFullTableName({ table });

  let entityDeclaration = `entity ${escapeName({ name: fullTableName })} <<${table.schema}>>`;
  if (table.comment) {
    entityDeclaration += ` : ${table.comment}`;
  }

  let result = `${entityDeclaration} {\n`;
  result += generatePrimaryKeyColumns({ table });
  result += generateRegularColumns({ table });
  result += '}\n\n';

  return result;
};

const getColumnNotes = ({
  column,
  table,
}: {
  column: ColumnSchema;
  table: TableSchema;
}): string[] => {
  const notes: string[] = [];

  const fk = table.foreignKeys.find((foreignKey: ForeignKey) =>
    foreignKey.columns.includes(column.name)
  );
  if (fk) {
    notes.push('<<FK>>');
  }

  const uniqueIndex = table.indexes.find(
    (idx: IndexSchema) =>
      (idx.isUnique &&
        !idx.isPrimary &&
        idx.definition.includes(`(${column.name})`)) ||
      idx.definition.includes(`("${column.name}")`)
  );
  if (uniqueIndex) {
    notes.push('<<UNIQUE>>');
  }

  if (
    column.default &&
    column.default !== 'CURRENT_TIMESTAMP' &&
    column.default !== 'now()'
  ) {
    notes.push(`DEFAULT: ${column.default}`);
  }

  return notes;
};

const generateRelationship = ({
  table,
  fk,
}: {
  table: TableSchema;
  fk: ForeignKey;
}): string => {
  const sourceTable = table.name;
  const targetTable = fk.referencedTable;
  const sourceColumn = fk.columns[0];

  const column = table.columns.find(
    (col: ColumnSchema) => col.name === sourceColumn
  );

  const sourceFullName =
    table.schema !== 'public' ? `${table.schema}.${sourceTable}` : sourceTable;
  const targetFullName =
    fk.referencedSchema !== 'public'
      ? `${fk.referencedSchema}.${targetTable}`
      : targetTable;

  const relationshipType = column?.isNullable ? '||--o{' : '||--|{';
  const relationship = `${escapeName({ name: targetFullName })} ${relationshipType} ${escapeName({ name: sourceFullName })}`;

  return `${relationship} : ${fk.name.replace(/_/g, ' ')}\n`;
};

const generateSimplifiedEntity = ({
  table,
}: {
  table: TableSchema;
}): string => {
  let result = '';
  const fullTableName =
    table.schema !== 'public' ? `${table.schema}.${table.name}` : table.name;
  result += `entity ${escapeName({ name: fullTableName })} <<${table.schema}>> {\n`;

  if (table.primaryKey) {
    for (const pkCol of table.primaryKey.columns) {
      result += `  + ${pkCol} : PK\n`;
    }
  }

  for (const fk of table.foreignKeys) {
    for (const col of fk.columns) {
      if (!table.primaryKey?.columns.includes(col)) {
        result += `  # ${col} : FK\n`;
      }
    }
  }

  result += '}\n\n';
  return result;
};

const generateFullDiagram = ({ schema }: { schema: TableSchema[] }): string => {
  let result = '@startuml\n';
  result += 'title Database Schema\n\n';
  result += 'skinparam linetype ortho\n';
  result += 'hide circle\n\n';

  // Generate entities
  const filteredSchema = schema.filter(
    (table) => !table.name.startsWith('_prisma')
  );
  for (const table of filteredSchema) {
    result += generateTableEntity({ table });
  }

  // Generate relationships
  result += "'Relationships\n";
  for (const table of filteredSchema) {
    for (const fk of table.foreignKeys) {
      result += generateRelationship({ table, fk });
    }
  }
  result += '\n@enduml';
  return result;
};

const generateSimplifiedDiagram = ({
  schema,
}: {
  schema: TableSchema[];
}): string => {
  let result = '@startuml\n';
  result += 'title Database Schema (Simplified)\n\n';
  result += 'skinparam linetype ortho\n';
  result += 'hide circle\n\n';

  const filteredSchema = schema.filter(
    (table) => !table.name.startsWith('_prisma')
  );

  for (const table of filteredSchema) {
    result += generateSimplifiedEntity({ table });
  }

  // Add simplified relationships
  for (const table of filteredSchema) {
    for (const fk of table.foreignKeys) {
      const sourceFullName = getFullTableName({ table });
      const targetFullName =
        fk.referencedSchema !== 'public'
          ? `${fk.referencedSchema}.${fk.referencedTable}`
          : fk.referencedTable;
      result += `${escapeName({ name: targetFullName })} ||--o{ ${escapeName({ name: sourceFullName })}\n`;
    }
  }

  result += '\n@enduml';
  return result;
};

export const generatePlantumlSchema = ({
  schema,
}: {
  schema: TableSchema[];
}): {
  full: string;
  simplified: string;
} => {
  return {
    full: generateFullDiagram({ schema }),
    simplified: generateSimplifiedDiagram({ schema }),
  };
};
