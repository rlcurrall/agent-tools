/**
 * Handle command errors consistently
 * Prints error message and exits with code 1
 */
export function handleCommandError(error: unknown): never {
  const message =
    error instanceof Error ? error.message : 'Unknown error occurred';
  console.error(`Error: ${message}`);
  process.exit(1);
}
