/**
 * ADO comments command - Get comments from a pull request
 */

import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { loadAzureDevOpsConfig } from '@lib/config.js';
import { AzureDevOpsClient } from '@lib/azure-devops-client.js';
import { discoverRepoInfo, parsePRUrl, validatePRId } from '@lib/ado-utils.js';
import type { AdoFlattenedComment } from '@lib/types.js';

type OutputFormat = 'text' | 'json' | 'markdown';

export interface CommentsArgv {
  prIdOrUrl: string;
  project?: string;
  repo?: string;
  format: OutputFormat;
  author?: string;
  since?: string;
  latest?: number;
  includeSystem: boolean;
  threadStatus?: string;
}

/**
 * Filter comments based on provided criteria
 */
function filterComments(
  comments: AdoFlattenedComment[],
  filter: {
    author?: string;
    sinceDate?: string;
    latest?: number;
    includeSystem?: boolean;
    threadStatus?: string;
  }
): AdoFlattenedComment[] {
  let filtered = [...comments];

  // Filter by comment type
  if (!filter.includeSystem) {
    filtered = filtered.filter((c) => c.comment.commentType !== 'system');
  }

  // Filter by thread status
  if (filter.threadStatus) {
    filtered = filtered.filter(
      (c) => c.threadStatus.toLowerCase() === filter.threadStatus!.toLowerCase()
    );
  }

  // Filter by author
  if (filter.author) {
    const authorLower = filter.author.toLowerCase();
    filtered = filtered.filter((c) => {
      const displayName = c.comment.author.displayName.toLowerCase();
      const uniqueName = c.comment.author.uniqueName?.toLowerCase() || '';
      return (
        displayName.includes(authorLower) || uniqueName.includes(authorLower)
      );
    });
  }

  // Filter by date
  if (filter.sinceDate) {
    const sinceTime = new Date(filter.sinceDate).getTime();
    filtered = filtered.filter(
      (c) => new Date(c.comment.publishedDate).getTime() >= sinceTime
    );
  }

  // Sort by date (newest first)
  filtered.sort(
    (a, b) =>
      new Date(b.comment.publishedDate).getTime() -
      new Date(a.comment.publishedDate).getTime()
  );

  // Limit to latest N
  if (filter.latest && filter.latest > 0) {
    filtered = filtered.slice(0, filter.latest);
  }

  return filtered;
}

/**
 * Format comments output based on format type
 */
function formatOutput(
  comments: AdoFlattenedComment[],
  format: OutputFormat,
  prId: number
): string {
  if (format === 'json') {
    return JSON.stringify(comments, null, 2);
  }

  if (comments.length === 0) {
    return format === 'markdown'
      ? `# PR #${prId} Comments\n\nNo comments found.`
      : `No comments found for PR #${prId}.`;
  }

  if (format === 'markdown') {
    let output = `# PR #${prId} Comments\n\n`;
    output += `Total: ${comments.length} comment${comments.length === 1 ? '' : 's'}\n\n`;

    for (const item of comments) {
      const c = item.comment;
      const date = new Date(c.publishedDate).toISOString().split('T')[0];
      const threadInfo = item.filePath
        ? ` (${item.filePath}:${item.lineNumber || '?'})`
        : '';

      output += `## ${c.author.displayName}${threadInfo}\n`;
      output += `**Date:** ${date} | **Status:** ${item.threadStatus}\n\n`;
      output += `${c.content}\n\n`;
      output += `---\n\n`;
    }

    return output;
  }

  // Text format
  let output = `PR #${prId} Comments (${comments.length} total)\n`;
  output += '='.repeat(50) + '\n\n';

  for (const item of comments) {
    const c = item.comment;
    const date = new Date(c.publishedDate).toLocaleString();
    const threadInfo = item.filePath
      ? `\n  File: ${item.filePath}:${item.lineNumber || '?'}`
      : '';

    output += `[${date}] ${c.author.displayName}`;
    output += `\n  Thread Status: ${item.threadStatus}${threadInfo}\n`;
    output += `  ${c.content}\n\n`;
  }

  return output;
}

async function handler(argv: ArgumentsCamelCase<CommentsArgv>): Promise<void> {
  let prId: number | undefined;
  let { project, repo } = argv;
  const { format, author, since, latest, includeSystem, threadStatus } = argv;

  // Parse PR ID or URL
  if (argv.prIdOrUrl.startsWith('http')) {
    const parsed = parsePRUrl(argv.prIdOrUrl);
    if (!parsed) {
      console.error(`Error: Invalid Azure DevOps PR URL: ${argv.prIdOrUrl}`);
      console.error(
        'Expected format: https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}'
      );
      process.exit(1);
    }
    prId = parsed.prId;
    project = parsed.project;
    repo = parsed.repo;
  } else {
    const validation = validatePRId(argv.prIdOrUrl);
    if (validation.valid) {
      prId = validation.value;
    } else {
      console.error('Error: Invalid PR ID.');
      process.exit(1);
    }
  }

  // Auto-discover from git remote if not specified
  if (!project || !repo) {
    const discovered = discoverRepoInfo();
    if (discovered) {
      project = project || discovered.project;
      repo = repo || discovered.repo;
      if (format !== 'json') {
        console.log(
          `Auto-discovered: ${discovered.org}/${discovered.project}/${discovered.repo}`
        );
        console.log('');
      }
    }
  }

  // Validate we have project/repo
  if (!project || !repo) {
    console.error('Error: Could not determine project and repository.');
    console.error('');
    console.error('Either:');
    console.error(
      '  1. Run this command from within a git repository with Azure DevOps remote'
    );
    console.error('  2. Specify --project and --repo flags explicitly');
    console.error('  3. Provide a full PR URL');
    process.exit(1);
  }

  try {
    const config = loadAzureDevOpsConfig();
    const client = new AzureDevOpsClient(config);

    if (format !== 'json') {
      console.log(`Fetching comments for PR #${prId}...`);
      if (author) console.log(`Filtering by author: ${author}`);
      if (since) console.log(`Since date: ${since}`);
      if (latest) console.log(`Latest: ${latest} comments`);
      if (threadStatus) console.log(`Thread status: ${threadStatus}`);
      console.log('');
    }

    // Fetch all comments
    const allComments = await client.getAllComments(project, repo, prId!);

    // Apply filters
    const filtered = filterComments(allComments, {
      author,
      sinceDate: since,
      latest,
      includeSystem,
      threadStatus,
    });

    // Format and output
    const output = formatOutput(filtered, format, prId!);
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

export const commentsCommand: CommandModule<object, CommentsArgv> = {
  command: 'comments <prIdOrUrl>',
  describe: 'Get comments from an Azure DevOps pull request',
  builder: {
    prIdOrUrl: {
      type: 'string',
      describe: 'PR ID or full PR URL',
      demandOption: true,
    },
    project: {
      type: 'string',
      describe: 'Azure DevOps project name (auto-discovered from git remote)',
    },
    repo: {
      type: 'string',
      describe: 'Repository name (auto-discovered from git remote)',
    },
    format: {
      type: 'string',
      choices: ['text', 'json', 'markdown'] as const,
      default: 'text' as const,
      describe: 'Output format',
    },
    author: {
      type: 'string',
      describe: 'Filter comments by author name or email',
    },
    since: {
      type: 'string',
      describe: 'Show comments since date (YYYY-MM-DD)',
    },
    latest: {
      type: 'number',
      describe: 'Show only N most recent comments',
    },
    'include-system': {
      type: 'boolean',
      default: false,
      describe: 'Include system comments',
    },
    'thread-status': {
      type: 'string',
      describe: 'Filter by thread status (active, fixed, wontFix, closed)',
    },
  },
  handler,
};
