/**
 * Jira search command
 * Search for Jira tickets using JQL (Jira Query Language)
 */

import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import { loadConfig } from '@lib/config.js';
import { JiraClient } from '@lib/jira-client.js';
import { formatSearchResults } from '@lib/cli-utils.js';
import { validateArgs } from '@lib/validation.js';
import { SearchArgsSchema, type SearchArgs } from '@schemas/jira/search.js';
import { handleCommandError } from '@lib/errors.js';

async function handler(argv: ArgumentsCamelCase<SearchArgs>): Promise<void> {
  // Validate arguments with Valibot schema
  const validated = validateArgs(SearchArgsSchema, argv, 'search arguments');
  const maxResults = validated.maxResults ?? validated.limit ?? 50;
  const format = validated.format;

  try {
    const config = loadConfig();
    const client = new JiraClient(config);

    if (format !== 'json') {
      console.log(`Searching Jira for: ${validated.query}`);
      console.log(`Max results: ${maxResults}`);
      console.log('');
    }

    const response = await client.searchIssues(validated.query, maxResults);

    if (format === 'json') {
      console.log(JSON.stringify(response, null, 2));
    } else {
      const output = formatSearchResults(response);
      console.log(output);
    }
  } catch (error) {
    handleCommandError(error);
  }
}

export default {
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
} satisfies CommandModule<object, SearchArgs>;
