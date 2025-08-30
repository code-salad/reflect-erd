#!/usr/bin/env bun
import {
  contextCommand,
  contextHelp,
  infoCommand,
  infoHelp,
  joinCommand,
  joinHelp,
  listCommand,
  listHelp,
  sampleCommand,
  sampleHelp,
  schemaCommand,
  schemaHelp,
  tableCommand,
  tableHelp,
} from './commands';

const showMainHelp = () => {
  console.log(`vsequel - Database ERD extraction tool

Usage:
  vsequel <command> [options]

Subcommands:
  schema   Extract full database schema
  table    Get schema for a specific table
  list     List all table names
  sample   Get sample data from a table
  context  Get schema and sample data for a table
  join     Find shortest join path between tables
  info     Show database connection info

Global Options:
  --db <url>  Database connection URL (required for most commands)
  --help      Show help for a specific command

Examples:
  vsequel schema --db postgresql://localhost/mydb
  vsequel table --db postgresql://localhost/mydb --table users
  vsequel list --db postgresql://localhost/mydb
  vsequel --help
  vsequel schema --help`);
};
const parseArgs = (args) => {
  const parsed = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (!arg) {
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        parsed[key] = nextArg;
        i += 2;
      } else {
        parsed[key] = true;
        i += 1;
      }
    } else {
      if (!parsed.command) {
        parsed.command = arg;
      }
      i += 1;
    }
  }
  return parsed;
};
const validateOutputFormat = (format, validFormats) => {
  if (!validFormats.includes(format)) {
    console.error(`Error: Invalid output format '${format}'`);
    process.exit(1);
  }
};
const showCommandHelp = (command) => {
  switch (command) {
    case 'schema':
      schemaHelp();
      break;
    case 'table':
      tableHelp();
      break;
    case 'list':
      listHelp();
      break;
    case 'sample':
      sampleHelp();
      break;
    case 'context':
      contextHelp();
      break;
    case 'join':
      joinHelp();
      break;
    case 'info':
      infoHelp();
      break;
    default:
      console.error(`Error: Unknown command '${command}'`);
      showMainHelp();
      process.exit(1);
  }
};
const requireDb = (db, helpFn) => {
  if (!db) {
    console.error('Error: Database URL is required');
    helpFn();
    process.exit(1);
  }
  return db;
};
const requireArg = (arg, argName, helpFn) => {
  if (!arg) {
    console.error(`Error: --${argName} is required`);
    helpFn();
    process.exit(1);
  }
  return arg;
};
const main = async () => {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);
  // Extract command (if any)
  const { command, ...parsedArgs } = parsed;
  const commandStr = command;
  // Handle help flags
  if (parsedArgs.help === true) {
    if (commandStr) {
      showCommandHelp(commandStr);
    } else {
      showMainHelp();
    }
    process.exit(0);
  }
  // If no command, show main help
  if (!commandStr) {
    console.error('Error: Command is required');
    showMainHelp();
    process.exit(1);
  }
  // Handle commands
  const db = parsedArgs.db;
  switch (commandStr) {
    case 'schema': {
      requireDb(db, schemaHelp);
      const output = parsedArgs.output;
      if (output) {
        validateOutputFormat(output, ['json', 'plantuml', 'full-plantuml']);
      }
      await schemaCommand({
        db,
        output,
      });
      break;
    }
    case 'table': {
      requireDb(db, tableHelp);
      const table = requireArg(parsedArgs.table, 'table', tableHelp);
      await tableCommand({
        db,
        table,
        schema: parsedArgs.schema,
        withSample: parsedArgs['with-sample'] === true,
      });
      break;
    }
    case 'list': {
      requireDb(db, listHelp);
      const output = parsedArgs.output;
      if (output) {
        validateOutputFormat(output, ['simple', 'json']);
      }
      await listCommand({
        db,
        output,
      });
      break;
    }
    case 'sample': {
      requireDb(db, sampleHelp);
      const table = requireArg(parsedArgs.table, 'table', sampleHelp);
      const limit = parsedArgs.limit
        ? Number.parseInt(parsedArgs.limit, 10)
        : undefined;
      await sampleCommand({
        db,
        table,
        schema: parsedArgs.schema,
        limit,
      });
      break;
    }
    case 'context': {
      requireDb(db, contextHelp);
      const table = requireArg(parsedArgs.table, 'table', contextHelp);
      await contextCommand({
        db,
        table,
        schema: parsedArgs.schema,
      });
      break;
    }
    case 'join': {
      requireDb(db, joinHelp);
      const tables = requireArg(parsedArgs.tables, 'tables', joinHelp);
      const output = parsedArgs.output;
      if (output) {
        validateOutputFormat(output, ['json', 'sql']);
      }
      await joinCommand({
        db,
        tables,
        output,
      });
      break;
    }
    case 'info': {
      requireDb(db, infoHelp);
      await infoCommand({ db });
      break;
    }
    default:
      console.error(`Error: Unknown command '${commandStr}'`);
      showMainHelp();
      process.exit(1);
  }
};
// Run the CLI
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
//# sourceMappingURL=index.js.map
