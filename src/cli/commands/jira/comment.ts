/**
 * Jira comment command
 * Add a comment to a specific Jira ticket
 */

import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { loadConfig } from '@lib/config.js';
import { JiraClient } from '@lib/jira-client.js';
import { validateTicketKey } from '@lib/cli-utils.js';
import { convert as markdownToAdf } from '@lib/md-to-adf.js';

export interface CommentArgv {
  ticketKey: string;
  comment?: string;
  file?: string;
  format: 'text' | 'json' | 'markdown';
}

async function handler(argv: ArgumentsCamelCase<CommentArgv>): Promise<void> {
  const { ticketKey, format } = argv;

  // Get comment content from args or file
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
  } else if (argv.comment) {
    markdownContent = argv.comment;
  } else {
    console.error('Error: Comment content is required.');
    console.error(
      'Provide comment text as an argument or use -f/--file to specify a file.'
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
      console.log(`Adding comment to ticket: ${ticketKey}`);
      console.log('Converting markdown to Jira format...');
    }

    // Convert markdown to ADF
    const adfBody = markdownToAdf(markdownContent);

    if (format !== 'json') {
      console.log('Posting comment to Jira...');
      console.log('');
    }

    const result = await client.addComment(ticketKey, adfBody);

    if (format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Comment added successfully!`);
      console.log(`Comment ID: ${result.id}`);
      console.log(`Created: ${result.created}`);
      console.log(`Author: ${result.author.displayName}`);
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

export const commentCommand: CommandModule<object, CommentArgv> = {
  command: 'comment <ticketKey> [comment]',
  describe: 'Add a comment to a ticket',
  builder: {
    ticketKey: {
      type: 'string',
      describe: 'Jira ticket key (e.g., PROJ-123)',
      demandOption: true,
    },
    comment: {
      type: 'string',
      describe: 'Comment text in markdown format',
    },
    file: {
      type: 'string',
      alias: 'f',
      describe: 'Read comment from markdown file',
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
