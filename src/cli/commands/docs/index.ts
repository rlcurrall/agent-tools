/**
 * Documentation service commands
 * Routes to documentation-related commands (update)
 */

import type { CommandModule } from 'yargs';
import { updateCommand } from './update.js';

export const docsCommands: CommandModule = {
  command: 'docs <command>',
  describe: 'Documentation management commands',
  builder: (yargs) =>
    yargs
      .command(updateCommand)
      .demandCommand(1, 'Please specify a docs command')
      .example('$0 docs update', 'Update project and global CLAUDE.md'),
  handler: () => {
    // This won't be called due to demandCommand
  },
};
