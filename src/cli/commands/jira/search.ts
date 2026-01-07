/**
 * Jira search command
 * Search for Jira tickets using JQL (Jira Query Language)
 */

import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { loadConfig } from '@lib/config.js';
import { JiraClient } from '@lib/jira-client.js';
import { formatSearchResults } from '@lib/cli-utils.js';

export interface SearchArgv {
  query: string;
  maxResults?: number;
  limit?: number;
  format: 'text' | 'json' | 'markdown';
}

async function handler(argv: ArgumentsCamelCase<SearchArgv>): Promise<void> {
  const maxResults = argv.maxResults ?? argv.limit ?? 50;
  const format = argv.format;

  try {
    const config = loadConfig();
    const client = new JiraClient(config);

    if (format !== 'json') {
      console.log(`Searching Jira for: ${argv.query}`);
      console.log(`Max results: ${maxResults}`);
      console.log('');
    }

    const response = await client.searchIssues(argv.query, maxResults);

    if (format === 'json') {
      console.log(JSON.stringify(response, null, 2));
    } else {
      const output = formatSearchResults(response);
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

export const searchCommand: CommandModule<object, SearchArgv> = {
  command: 'search <query> [maxResults]',
  describe: 'Search Jira tickets using JQL',
  builder: {
    query: {
      type: 'string',
      describe: 'JQL query string',
      demandOption: true,
    },
    maxResults: {
      type: 'number',
      describe: 'Maximum results to return (default: 50)',
    },
    limit: {
      type: 'number',
      describe: 'Alias for maxResults',
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
