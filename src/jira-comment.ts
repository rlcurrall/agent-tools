#!/usr/bin/env bun

import { loadConfig } from './config.js';
import { JiraClient } from './jira-client.js';
import { validateTicketKey } from './cli-utils.js';
import { convert as markdownToAdf } from './md-to-adf.js';

function parseCommentArgs(args: string[]): {
  ticketKey?: string;
  comment?: string;
  help?: boolean;
  fromFile?: string;
} {
  const result: {
    ticketKey?: string;
    comment?: string;
    help?: boolean;
    fromFile?: string;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      result.help = true;
    } else if (arg === '-f' || arg === '--file') {
      // Next argument should be the file path
      if (i + 1 < args.length) {
        result.fromFile = args[i + 1];
        i++; // Skip the next argument since we consumed it
      }
    } else if (!result.ticketKey) {
      result.ticketKey = arg;
    } else if (!result.comment && !result.fromFile) {
      result.comment = arg;
    }
  }

  return result;
}

function showHelp(scriptName: string = 'jira-comment') {
  console.log(`
DESCRIPTION:
    Add a comment to a specific Jira ticket. Accepts markdown input and converts it to
    Jira's Atlassian Document Format (ADF) automatically.

USAGE:
    ${scriptName} TICKET_KEY "MARKDOWN_COMMENT"
    ${scriptName} TICKET_KEY -f MARKDOWN_FILE
    ${scriptName} -h | --help

ARGUMENTS:
    TICKET_KEY          Jira ticket key (required, e.g., PROJ-123, ABC-456)
    MARKDOWN_COMMENT    Comment text in markdown format (required if not using -f)

OPTIONS:
    -f, --file FILE     Read comment from markdown file instead of command line
    -h, --help          Show this help message

EXAMPLES:
    Basic comment:
        ${scriptName} PROJ-123 "This is a simple comment"

    Markdown formatting:
        ${scriptName} PROJ-123 "# Status Update\\n\\n- [x] Completed task A\\n- [ ] Working on task B\\n\\n**Next steps**: Deploy to staging"

    From file:
        ${scriptName} PROJ-123 -f comment.md

    Complex markdown:
        ${scriptName} ABC-456 "Found the issue in \\\`getUserData()\\\` function:\\n\\n\\\`\\\`\\\`javascript\\nif (!user.id) {\\n  throw new Error('User ID required');\\n}\\n\\\`\\\`\\\`\\n\\nThis should fix the authentication problem."

MARKDOWN FEATURES SUPPORTED:
    - Headers (# ## ###)
    - **Bold** and *italic* text
    - \\\`inline code\\\` and code blocks
    - [Links](http://example.com)
    - Lists (- item or 1. item)
    - > Blockquotes
    - ~~Strikethrough~~
    - Tables
    - Task lists (- [x] done, - [ ] todo)

SETUP:
    Make sure your Jira credentials are configured as environment variables:
    - JIRA_URL (your Jira instance URL)
    - JIRA_EMAIL or JIRA_USERNAME (your email/username)
    - JIRA_API_TOKEN or JIRA_TOKEN (your API token)

    Or create a .env file (copy from .env.example)

REQUIREMENTS:
    - Bun runtime

OUTPUT:
    On success, displays the created comment ID and confirmation.
    The comment will appear in Jira with proper formatting converted from markdown.
`);
}

async function main() {
  const args = process.argv.slice(2);
  const { ticketKey, comment, help, fromFile } = parseCommentArgs(args);

  if (help) {
    showHelp();
    process.exit(0);
  }

  if (!ticketKey) {
    console.error('Error: Ticket key is required.');
    console.error('');
    console.error('Usage: jira-comment TICKET_KEY "MARKDOWN_COMMENT"');
    console.error('   or: jira-comment TICKET_KEY -f MARKDOWN_FILE');
    console.error('');
    console.error('Examples:');
    console.error(
      '  jira-comment PROJ-123 "# Update\\n\\nTask completed successfully"'
    );
    console.error('  jira-comment PROJ-123 -f status-update.md');
    console.error('');
    console.error('For more help: jira-comment --help');
    process.exit(1);
  }

  // Get comment content
  let markdownContent: string;
  if (fromFile) {
    try {
      const file = Bun.file(fromFile);
      markdownContent = await file.text();
    } catch (error) {
      console.error(`Error: Could not read file '${fromFile}'`);
      if (error instanceof Error) {
        console.error(`Details: ${error.message}`);
      }
      process.exit(1);
    }
  } else if (comment) {
    markdownContent = comment;
  } else {
    console.error('Error: Comment content is required.');
    console.error(
      'Provide comment text as an argument or use -f to specify a file.'
    );
    console.error('');
    console.error('For more help: jira-comment --help');
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

    console.log(`Adding comment to ticket: ${ticketKey}`);
    console.log('Converting markdown to Jira format...');

    // Convert markdown to ADF
    const adfBody = markdownToAdf(markdownContent);

    console.log('Posting comment to Jira...');
    console.log('');

    const result = await client.addComment(ticketKey, adfBody);

    console.log(`✓ Comment added successfully!`);
    console.log(`Comment ID: ${result.id}`);
    console.log(`Created: ${result.created}`);
    console.log(`Author: ${result.author.displayName}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Error: Unknown error occurred');
    }
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.main) {
  main();
}
