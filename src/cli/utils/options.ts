import { option, string } from 'cmd-ts';

/**
 * Shared database option used across multiple commands
 */
export const dbOption = option({
  type: string,
  long: 'db',
  short: 'd',
  description: 'Database connection URL',
});
