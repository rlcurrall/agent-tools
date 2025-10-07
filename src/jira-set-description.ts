#!/usr/bin/env bun

import { loadConfig } from './config.js';
import { JiraClient } from './jira-client.js';
import { validateTicketKey } from './cli-utils.js';
import { convert as markdownToAdf } from './md-to-adf.js';

function parseDescriptionArgs(args: string[]): {
  ticketKey?: string;
  description?: string;
  help?: boolean;
  fromFile?: string;
} {
  const result: {
    ticketKey?: string;
    description?: string;
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
    } else if (!result.description && !result.fromFile) {
      result.description = arg;
    }
  }

  return result;
}

function showHelp(scriptName: string = 'jira-set-description') {
  console.log(`
DESCRIPTION:
    Set or update the description of a specific Jira ticket. Accepts markdown input and
    converts it to Jira's Atlassian Document Format (ADF) automatically. This will
    completely replace the existing description.

USAGE:
    ${scriptName} TICKET_KEY "MARKDOWN_DESCRIPTION"
    ${scriptName} TICKET_KEY -f MARKDOWN_FILE
    ${scriptName} -h | --help

ARGUMENTS:
    TICKET_KEY              Jira ticket key (required, e.g., PROJ-123, ABC-456)
    MARKDOWN_DESCRIPTION    Description text in markdown format (required if not using -f)

OPTIONS:
    -f, --file FILE     Read description from markdown file instead of command line
    -h, --help          Show this help message

EXAMPLES:
    Basic description:
        ${scriptName} PROJ-123 "This ticket tracks the implementation of user authentication"

    Markdown formatting:
        ${scriptName} PROJ-123 "# Overview\\n\\nImplement OAuth 2.0 authentication\\n\\n## Requirements\\n\\n- [ ] Add login endpoint\\n- [ ] Implement token refresh\\n- [ ] Add session management\\n\\n**Priority**: High"

    From file:
        ${scriptName} PROJ-123 -f description.md

    Complex markdown:
        ${scriptName} ABC-456 "## Problem\\n\\nUsers report timeout errors when loading large datasets.\\n\\n## Root Cause\\n\\nThe \\\`fetchData()\\\` function doesn't implement pagination.\\n\\n\\\`\\\`\\\`javascript\\nfunction fetchData() {\\n  // TODO: Add pagination\\n  return db.query('SELECT * FROM users');\\n}\\n\\\`\\\`\\\`\\n\\n## Solution\\n\\nImplement cursor-based pagination to limit query size."

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

WARNING:
    This command will REPLACE the existing description entirely. Make sure you have
    the current description backed up if you need to preserve any existing content.

SETUP:
    Make sure your Jira credentials are configured as environment variables:
    - JIRA_URL (your Jira instance URL)
    - JIRA_EMAIL or JIRA_USERNAME (your email/username)
    - JIRA_API_TOKEN or JIRA_TOKEN (your API token)

    Or create a .env file (copy from .env.example)

REQUIREMENTS:
    - Bun runtime

OUTPUT:
    On success, displays confirmation that the description was updated.
    The description will appear in Jira with proper formatting converted from markdown.
`);
}

async function main() {
  const args = process.argv.slice(2);
  const { ticketKey, description, help, fromFile } = parseDescriptionArgs(args);

  if (help) {
    showHelp();
    process.exit(0);
  }

  if (!ticketKey) {
    console.error('Error: Ticket key is required.');
    console.error('');
    console.error(
      'Usage: jira-set-description TICKET_KEY "MARKDOWN_DESCRIPTION"'
    );
    console.error('   or: jira-set-description TICKET_KEY -f MARKDOWN_FILE');
    console.error('');
    console.error('Examples:');
    console.error(
      '  jira-set-description PROJ-123 "# Overview\\n\\nThis ticket implements feature X"'
    );
    console.error('  jira-set-description PROJ-123 -f description.md');
    console.error('');
    console.error('For more help: jira-set-description --help');
    process.exit(1);
  }

  // Get description content
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
  } else if (description) {
    markdownContent = description;
  } else {
    console.error('Error: Description content is required.');
    console.error(
      'Provide description text as an argument or use -f to specify a file.'
    );
    console.error('');
    console.error('For more help: jira-set-description --help');
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

    console.log(`Updating description for ticket: ${ticketKey}`);
    console.log('Converting markdown to Jira format...');

    // Convert markdown to ADF
    const adfBody = markdownToAdf(markdownContent);

    console.log('Updating ticket description in Jira...');
    console.log('');

    await client.setDescription(ticketKey, adfBody);

    console.log(`✓ Description updated successfully!`);
    console.log(`Ticket: ${ticketKey}`);
    console.log(`View ticket: ${config.url}/browse/${ticketKey}`);
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
