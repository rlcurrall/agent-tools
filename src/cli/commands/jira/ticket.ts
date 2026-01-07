/**
 * Jira ticket command
 * Get detailed information about a specific Jira ticket
 */

import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { loadConfig } from '@lib/config.js';
import { JiraClient } from '@lib/jira-client.js';
import { formatTicketDetails, validateTicketKey } from '@lib/cli-utils.js';

export interface TicketArgv {
  ticketKey: string;
  format: 'text' | 'json' | 'markdown';
}

async function handler(argv: ArgumentsCamelCase<TicketArgv>): Promise<void> {
  const { ticketKey, format } = argv;

  // Validate ticket key format
  const validation = validateTicketKey(ticketKey);
  if (!validation.valid && validation.warning) {
    console.log(validation.warning);
    console.log('Proceeding anyway...');
    console.log('');
  }

  try {
    const config = loadConfig();
    const client = new JiraClient(config);

    if (format !== 'json') {
      console.log(`Fetching details for ticket: ${ticketKey}`);
      console.log('');
    }

    const issue = await client.getIssue(ticketKey);

    if (format === 'json') {
      console.log(JSON.stringify(issue, null, 2));
    } else {
      const output = formatTicketDetails(issue);
      console.log(output);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Error: Unknown error occurred');
    }
    process.exit(1);
  }
}

export const ticketCommand: CommandModule<object, TicketArgv> = {
  command: 'ticket <ticketKey>',
  describe: 'Get ticket details (summary, description, metadata)',
  builder: {
    ticketKey: {
      type: 'string',
      describe: 'Jira ticket key (e.g., PROJ-123)',
      demandOption: true,
    },
    format: {
      type: 'string',
      choices: ['text', 'json', 'markdown'] as const,
      default: 'text' as const,
      describe: 'Output format',
    },
  },
  handler,
};
