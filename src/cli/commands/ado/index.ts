/**
 * Azure DevOps service commands
 * Routes to ADO-related commands (prs, comments)
 */

import type { CommandModule } from 'yargs';
import { prsCommand } from './prs.js';
import { commentsCommand } from './comments.js';

export const adoCommands: CommandModule = {
  command: 'ado <command>',
  describe: 'Azure DevOps pull request commands',
  builder: (yargs) =>
    yargs
      .command(prsCommand)
      .command(commentsCommand)
      .demandCommand(1, 'Please specify an ado command')
      .example('$0 ado prs --status active', 'List active PRs')
      .example('$0 ado prs --created-by "your.email"', 'List your PRs')
      .example('$0 ado comments 24094 --latest 5', 'Get recent PR comments'),
  handler: () => {
    // This won't be called due to demandCommand
  },
};
