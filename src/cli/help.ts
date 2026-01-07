/**
 * CLI constants and version information
 */
import packageJson from '../../package.json' assert { type: 'json' };

export const CLI_NAME = packageJson.name;
export const VERSION = packageJson.version;
