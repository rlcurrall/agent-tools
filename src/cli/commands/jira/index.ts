/**
 * Jira service commands
 * Routes to Jira-related commands (search, ticket, comment, comments, desc)
 */

import type { CommandModule } from 'yargs';

// Import all command modules
import { searchCommand } from './search.js';
import { ticketCommand } from './ticket.js';
import { commentCommand } from './comment.js';
import { commentsCommand } from './comments.js';
import { descCommand } from './desc.js';

export const jiraCommands: CommandModule = {
  command: 'jira <command>',
  describe: 'Jira ticket management commands',
  builder: (yargs) =>
    yargs
      .command(searchCommand)
      .command(ticketCommand)
      .command(commentCommand)
      .command(commentsCommand)
      .command(descCommand)
      .demandCommand(1, 'Please specify a jira command')
      .example('$0 jira search "assignee = currentUser()"', 'Search tickets')
      .example('$0 jira ticket PROJ-123', 'Get ticket details')
      .example('$0 jira comment PROJ-123 "Comment text"', 'Add a comment')
      .example('$0 jira comments PROJ-123 --latest 5', 'Get recent comments')
      .example('$0 jira desc PROJ-123 "New description"', 'Update description'),
  handler: () => {
    // This won't be called due to demandCommand
  },
};
