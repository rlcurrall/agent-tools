/**
 * Jira desc command
 * Set or update the description of a specific Jira ticket
 */

import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { loadConfig } from '@lib/config.js';
import { JiraClient } from '@lib/jira-client.js';
import { validateTicketKey } from '@lib/cli-utils.js';
import { convert as markdownToAdf } from '@lib/md-to-adf.js';

export interface DescArgv {
  ticketKey: string;
  description?: string;
  file?: string;
  format: 'text' | 'json' | 'markdown';
}

async function handler(argv: ArgumentsCamelCase<DescArgv>): Promise<void> {
  const { ticketKey, format } = argv;

  // Get description content from args or file
  let markdownContent: string;

  if (argv.file) {
    try {
      const file = Bun.file(argv.file);
      markdownContent = await file.text();
    } catch (error) {
      console.error(`Error: Could not read file '${argv.file}'`);
      if (error instanceof Error) {
        console.error(`Details: ${error.message}`);
      }
      process.exit(1);
    }
  } else if (argv.description) {
    markdownContent = argv.description;
  } else {
    console.error('Error: Description content is required.');
    console.error(
      'Provide description text as an argument or use -f/--file to specify a file.'
    );
    process.exit(1);
  }

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
      console.log(`Updating description for ticket: ${ticketKey}`);
      console.log('Converting markdown to Jira format...');
    }

    // Convert markdown to ADF
    const adfBody = markdownToAdf(markdownContent);

    if (format !== 'json') {
      console.log('Updating ticket description in Jira...');
      console.log('');
    }

    await client.setDescription(ticketKey, adfBody);

    if (format === 'json') {
      console.log(
        JSON.stringify(
          {
            success: true,
            ticketKey,
            url: `${config.url}/browse/${ticketKey}`,
          },
          null,
          2
        )
      );
    } else {
      console.log(`Description updated successfully!`);
      console.log(`Ticket: ${ticketKey}`);
      console.log(`View ticket: ${config.url}/browse/${ticketKey}`);
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

export const descCommand: CommandModule<object, DescArgv> = {
  command: 'desc <ticketKey> [description]',
  describe: 'Set or update ticket description',
  builder: {
    ticketKey: {
      type: 'string',
      describe: 'Jira ticket key (e.g., PROJ-123)',
      demandOption: true,
    },
    description: {
      type: 'string',
      describe: 'Description text in markdown format',
    },
    file: {
      type: 'string',
      alias: 'f',
      describe: 'Read description from markdown file',
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
