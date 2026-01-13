/**
 * Jira ticket command
 * Get detailed information about a specific Jira ticket
 */

import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import { loadConfig } from '@lib/config.js';
import { JiraClient } from '@lib/jira-client.js';
import { formatTicketDetails } from '@lib/cli-utils.js';
import { validateArgs } from '@lib/validation.js';
import { isValidTicketKeyFormat } from '@schemas/common.js';
import { TicketArgsSchema, type TicketArgs } from '@schemas/jira/ticket.js';
import { handleCommandError } from '@lib/errors.js';

async function handler(argv: ArgumentsCamelCase<TicketArgs>): Promise<void> {
  const args = validateArgs(TicketArgsSchema, argv, 'ticket arguments');
  const { ticketKey, format } = args;

  // Validate ticket key format (soft validation with warning)
  if (!isValidTicketKeyFormat(ticketKey)) {
    console.log(
      `Warning: '${ticketKey}' doesn't match typical Jira ticket format (PROJECT-123)`
    );
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
    handleCommandError(error);
  }
}

export default {
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
} satisfies CommandModule<object, TicketArgs>;
