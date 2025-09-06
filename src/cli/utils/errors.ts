/**
 * CLI error handling utilities
 */
export const handleCliError = (error: unknown): void => {
  console.error('Error:', (error as Error).message);
  process.exit(1);
};
