#!/usr/bin/env node

import { run, subcommands } from 'cmd-ts';
import {
  contextCommand,
  infoCommand,
  joinCommand,
  listCommand,
  plantumlCommand,
  safeQueryCommand,
  sampleCommand,
  schemaCommand,
  tableCommand,
} from './commands';

const app = subcommands({
  name: 'vsequel',
  description: 'Database ERD extraction tool',
  cmds: {
    schema: schemaCommand,
    plantuml: plantumlCommand,
    table: tableCommand,
    list: listCommand,
    sample: sampleCommand,
    context: contextCommand,
    join: joinCommand,
    'safe-query': safeQueryCommand,
    info: infoCommand,
  },
});

run(app, process.argv.slice(2)).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
