#!/usr/bin/env bun

import { loadConfig } from './config.js';
import { JiraClient } from './jira-client.js';
import { validateTicketKey } from './cli-utils.js';
import {
  filterComments,
  formatCommentsOutput,
  type CommentFilter,
} from './comment-utils.js';

interface CommentsArgs {
  ticketKey?: string;
  help?: boolean;
  format?: 'text' | 'json' | 'markdown';
  author?: string;
  sinceDate?: string;
  latest?: number;
  maxResults?: number;
  all?: boolean;
}

function parseCommentsArgs(args: string[]): CommentsArgs {
  const result: CommentsArgs = {
    format: 'text',
    maxResults: 100,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      result.help = true;
    } else if (arg === '--format') {
      if (i + 1 < args.length) {
        const format = args[i + 1] as 'text' | 'json' | 'markdown';
        if (['text', 'json', 'markdown'].includes(format)) {
          result.format = format;
        }
        i++;
      }
    } else if (arg === '--author') {
      if (i + 1 < args.length) {
        result.author = args[i + 1];
        i++;
      }
    } else if (arg === '--since' || arg === '--since-date') {
      if (i + 1 < args.length) {
        result.sinceDate = args[i + 1];
        i++;
      }
    } else if (arg === '--latest') {
      if (i + 1 < args.length && args[i + 1]) {
        const latest = parseInt(args[i + 1]!, 10);
        if (!isNaN(latest) && latest > 0) {
          result.latest = latest;
        }
        i++;
      }
    } else if (arg === '--max-results') {
      if (i + 1 < args.length && args[i + 1]) {
        const maxResults = parseInt(args[i + 1]!, 10);
        if (!isNaN(maxResults) && maxResults > 0) {
          result.maxResults = maxResults;
        }
        i++;
      }
    } else if (arg === '--all') {
      result.all = true;
      result.maxResults = 1000; // Large number to get all comments
    } else if (!result.ticketKey) {
      result.ticketKey = arg;
    }
  }

  return result;
}

function showHelp(scriptName: string = 'jira-get-comments') {
  console.log(`
DESCRIPTION:
    Retrieve comments from a specific Jira ticket with filtering and formatting options.
    Designed for AI integration and automated workflows.

USAGE:
    ${scriptName} TICKET_KEY [OPTIONS]
    ${scriptName} -h | --help

ARGUMENTS:
    TICKET_KEY      Jira ticket key (required, e.g., PROJ-123, ABC-456)

OPTIONS:
    --format FORMAT         Output format: text, json, or markdown (default: text)
    --author AUTHOR         Filter comments by author name or email (case-insensitive)
    --since DATE           Show comments created since date (YYYY-MM-DD or ISO format)
    --latest N             Show only the N most recent comments
    --max-results N        Maximum comments to fetch per API call (default: 100)
    --all                  Fetch all comments (may require multiple API calls)
    -h, --help             Show this help message

EXAMPLES:
    Basic usage:
        ${scriptName} PROJ-123

    Get latest 5 comments:
        ${scriptName} PROJ-123 --latest 5

    Comments by specific author:
        ${scriptName} PROJ-123 --author "john.doe"

    Comments since a specific date:
        ${scriptName} PROJ-123 --since 2024-01-01

    JSON output for AI processing:
        ${scriptName} PROJ-123 --format json

    Markdown format for documentation:
        ${scriptName} PROJ-123 --format markdown --latest 10

    Complex filtering:
        ${scriptName} PROJ-123 --author "smith" --since "2024-09-01" --format json

OUTPUT FORMATS:
    text        Human-readable format (default)
    json        Structured JSON for AI/script processing
    markdown    Formatted markdown for documentation

AI INTEGRATION EXAMPLES:
    # Get recent comments for analysis
    ${scriptName} PROJ-123 --latest 5 --format json | jq '.[] | .body'

    # Find comments by specific users
    ${scriptName} PROJ-123 --author "qa" --format text

    # Extract comment IDs
    ${scriptName} PROJ-123 --format json | jq '.[] | .id'

SETUP:
    Make sure your Jira credentials are configured as environment variables:
    - JIRA_URL (your Jira instance URL)
    - JIRA_EMAIL or JIRA_USERNAME (your email/username)
    - JIRA_API_TOKEN or JIRA_TOKEN (your API token)

    Or create a .env file (copy from .env.example)

REQUIREMENTS:
    - Bun runtime

NOTES:
    - Comments are converted from Jira's ADF format to readable text/markdown
    - Jira limits comments to 100 per API call (use --all for more)
    - Date filtering happens client-side after fetching from API
    - Author filtering matches both display name and email address
`);
}

async function getAllComments(
  client: JiraClient,
  issueKey: string,
  maxTotal: number = 1000
): Promise<any[]> {
  const allComments: any[] = [];
  let startAt = 0;
  const maxResults = 100; // Jira's limit per call

  while (allComments.length < maxTotal) {
    const response = await client.getComments(issueKey, startAt, maxResults);

    if (!response.comments || response.comments.length === 0) {
      break;
    }

    allComments.push(...response.comments);

    // Check if we've got all comments
    if (
      allComments.length >= response.total ||
      response.comments.length < maxResults
    ) {
      break;
    }

    startAt += maxResults;
  }

  return allComments;
}

async function main() {
  const args = process.argv.slice(2);
  const {
    ticketKey,
    help,
    format,
    author,
    sinceDate,
    latest,
    maxResults,
    all,
  } = parseCommentsArgs(args);

  if (help) {
    showHelp();
    process.exit(0);
  }

  if (!ticketKey) {
    console.error('Error: Ticket key is required.');
    console.error('');
    console.error('Usage: jira-get-comments TICKET_KEY [OPTIONS]');
    console.error('');
    console.error('Examples:');
    console.error('  jira-get-comments PROJ-123');
    console.error('  jira-get-comments PROJ-123 --latest 5 --format json');
    console.error(
      '  jira-get-comments PROJ-123 --author "john" --since 2024-01-01'
    );
    console.error('');
    console.error('For more help: jira-get-comments --help');
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
      console.log(`Fetching comments for ticket: ${ticketKey}`);
      if (author) console.log(`Filtering by author: ${author}`);
      if (sinceDate) console.log(`Since date: ${sinceDate}`);
      if (latest) console.log(`Latest: ${latest} comments`);
      console.log('');
    }

    // Fetch comments
    let comments: any[];
    if (all) {
      comments = await getAllComments(client, ticketKey);
    } else {
      const response = await client.getComments(
        ticketKey,
        0,
        maxResults || 100
      );
      comments = response.comments || [];
    }

    // Apply filters
    const filter: CommentFilter = {
      author,
      sinceDate,
      latest,
    };
    const filteredComments = filterComments(comments, filter);

    // Format and output
    const output = formatCommentsOutput(filteredComments, format, ticketKey);
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
