import { oneOf } from 'cmd-ts';

/**
 * Output format validators for different commands
 */
export const schemaOutputType = oneOf(['json', 'plantuml', 'full-plantuml']);
export const listOutputType = oneOf(['simple', 'json']);
export const joinOutputType = oneOf(['json', 'sql']);
