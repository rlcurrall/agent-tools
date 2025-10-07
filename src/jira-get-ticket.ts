#!/usr/bin/env bun

import { loadConfig } from './config.js';
import { JiraClient } from './jira-client.js';
import {
  parseTicketArgs,
  formatTicketDetails,
  validateTicketKey,
} from './cli-utils.js';

function showHelp(scriptName: string = 'jira-get-ticket') {
  console.log(`
DESCRIPTION:
    Fetch detailed information about a specific Jira ticket including summary, description,
    comments, attachments, subtasks, and metadata.

USAGE:
    ${scriptName} TICKET_KEY
    ${scriptName} -h | --help

ARGUMENTS:
    TICKET_KEY      Jira ticket key (required, e.g., PROJ-123, ABC-456)

OPTIONS:
    -h, --help      Show this help message

EXAMPLES:
    Basic usage:
        ${scriptName} PROJ-123
        ${scriptName} ABC-456
        ${scriptName} SUPPORT-789

    With different project prefixes:
        ${scriptName} DEV-42
        ${scriptName} BUG-999
        ${scriptName} FEATURE-100

OUTPUT INCLUDES:
    - Ticket summary and key
    - Project, issue type, status, priority
    - Reporter and assignee information
    - Created, updated, and resolved dates
    - Full description text
    - File attachments (if any)
    - Subtasks (if any)

NOTE:
    Comments are available separately using jira-get-comments.sh

SETUP:
    Make sure your Jira credentials are configured as environment variables:
    - JIRA_URL (your Jira instance URL)
    - JIRA_EMAIL or JIRA_USERNAME (your email/username)
    - JIRA_API_TOKEN or JIRA_TOKEN (your API token)

    Or create a .env file (copy from .env.example)

REQUIREMENTS:
    - Bun runtime

TROUBLESHOOTING:
    If you get "Ticket not found or access denied":
    - Check that the ticket key is correct (case-sensitive)
    - Verify you have permission to view the ticket
    - Ensure your API token is valid and not expired
    - Confirm the ticket exists in your Jira instance
`);
}

async function main() {
  const args = process.argv.slice(2);
  const { ticketKey, help } = parseTicketArgs(args);

  if (help) {
    showHelp();
    process.exit(0);
  }

  if (!ticketKey) {
    console.error('Error: Ticket key is required.');
    console.error('');
    console.error('Usage: jira-get-ticket TICKET_KEY');
    console.error('');
    console.error('Examples:');
    console.error('  jira-get-ticket PROJ-123');
    console.error('  jira-get-ticket ABC-456');
    console.error('');
    console.error('For more help: jira-get-ticket --help');
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

    console.log(`Fetching details for ticket: ${ticketKey}`);
    console.log('');

    const issue = await client.getIssue(ticketKey);
    const output = formatTicketDetails(issue);
    console.log(output);
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
