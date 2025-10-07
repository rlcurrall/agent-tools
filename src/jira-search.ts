#!/usr/bin/env bun

import { loadConfig } from './config.js';
import { JiraClient } from './jira-client.js';
import { parseArgs, formatSearchResults } from './cli-utils.js';

function showHelp(scriptName: string = 'jira-search') {
  console.log(`
DESCRIPTION:
    Search for Jira tickets using JQL (Jira Query Language) and display results in a formatted table.

USAGE:
    ${scriptName} "JQL_QUERY" [MAX_RESULTS]
    ${scriptName} -h | --help

ARGUMENTS:
    JQL_QUERY       JQL query string (required, must be quoted)
    MAX_RESULTS     Maximum number of results to return (default: 50)

OPTIONS:
    -h, --help      Show this help message

EXAMPLES:
    Basic searches:
        ${scriptName} "project = MYPROJ"
        ${scriptName} "assignee = currentUser()"
        ${scriptName} "status = Open"
        ${scriptName} "priority = High"

    Advanced searches:
        ${scriptName} "project = MYPROJ AND status = 'In Progress'"
        ${scriptName} "text ~ 'bug' AND created >= -30d"
        ${scriptName} "assignee = 'john.doe' OR reporter = 'john.doe'"
        ${scriptName} "status in (Open, 'In Progress') AND priority = High"

    Date-based searches:
        ${scriptName} "created >= '2024-01-01' AND created <= '2024-12-31'"
        ${scriptName} "updated >= -7d"
        ${scriptName} "resolved >= startOfWeek()"

    Limiting results:
        ${scriptName} "project = MYPROJ" 10
        ${scriptName} "status = Open" 100

COMMON JQL FIELDS:
    project, assignee, reporter, status, priority, created, updated, resolved,
    summary, description, component, fixVersion, labels, issuetype

COMMON JQL OPERATORS:
    =, !=, >, <, >=, <=, ~, !~, IN, NOT IN, IS, IS NOT

SETUP:
    Make sure your Jira credentials are configured as environment variables:
    - JIRA_URL (your Jira instance URL)
    - JIRA_EMAIL or JIRA_USERNAME (your email/username)
    - JIRA_API_TOKEN or JIRA_TOKEN (your API token)

    Or create a .env file (copy from .env.example)

REQUIREMENTS:
    - Bun runtime
`);
}

async function main() {
  const args = process.argv.slice(2);
  const { query, maxResults = 50, help } = parseArgs(args);

  if (help) {
    showHelp();
    process.exit(0);
  }

  if (!query) {
    console.error('Error: JQL query is required.');
    console.error('');
    console.error('Usage: jira-search "JQL_QUERY" [MAX_RESULTS]');
    console.error('');
    console.error('Examples:');
    console.error('  jira-search "project = MYPROJ AND status = Open"');
    console.error('  jira-search "assignee = currentUser()" 25');
    console.error('');
    console.error('For more help: jira-search --help');
    process.exit(1);
  }

  try {
    const config = loadConfig();
    const client = new JiraClient(config);

    console.log(`Searching Jira for: ${query}`);
    console.log(`Max results: ${maxResults}`);
    console.log('');

    const response = await client.searchIssues(query, maxResults);
    const output = formatSearchResults(response);
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
