#!/usr/bin/env bun

import { loadAzureDevOpsConfig } from './config.js';
import { AzureDevOpsClient } from './azure-devops-client.js';
import { discoverRepoInfo, parsePRUrl, validatePRId } from './ado-utils.js';

interface PRCommentsArgs {
  prId?: number;
  prUrl?: string;
  project?: string;
  repo?: string;
  help?: boolean;
  format?: 'text' | 'json' | 'markdown';
  author?: string;
  sinceDate?: string;
  latest?: number;
  includeSystem?: boolean;
  threadStatus?: string;
}

function parseArgs(args: string[]): PRCommentsArgs {
  const result: PRCommentsArgs = {
    format: 'text',
    includeSystem: false,
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
    } else if (arg === '--project') {
      if (i + 1 < args.length) {
        result.project = args[i + 1];
        i++;
      }
    } else if (arg === '--repo') {
      if (i + 1 < args.length) {
        result.repo = args[i + 1];
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
    } else if (arg === '--include-system') {
      result.includeSystem = true;
    } else if (arg === '--thread-status') {
      if (i + 1 < args.length) {
        result.threadStatus = args[i + 1];
        i++;
      }
    } else if (!result.prId && !result.prUrl) {
      // First positional argument - could be PR ID or URL
      if (arg.startsWith('http')) {
        result.prUrl = arg;
      } else {
        const validation = validatePRId(arg);
        if (validation.valid) {
          result.prId = validation.value;
        }
      }
    }
  }

  return result;
}

function showHelp(scriptName: string = 'ado-get-pr-comments') {
  console.log(`
DESCRIPTION:
    Retrieve comments from an Azure DevOps pull request with filtering and formatting options.
    Auto-discovers project and repository from git remote when in a git repository.
    Designed for AI integration and automated workflows.

USAGE:
    ${scriptName} PR_ID [OPTIONS]
    ${scriptName} PR_URL [OPTIONS]
    ${scriptName} PR_ID --project PROJECT --repo REPO [OPTIONS]
    ${scriptName} -h | --help

ARGUMENTS:
    PR_ID               Pull request ID (e.g., 23958)
    PR_URL              Full PR URL (e.g., https://dev.azure.com/org/project/_git/repo/pullrequest/123)

OPTIONS:
    --project PROJECT   Azure DevOps project name (auto-discovered from git remote if not specified)
    --repo REPO         Repository name (auto-discovered from git remote if not specified)
    --format FORMAT     Output format: text, json, or markdown (default: text)
    --author AUTHOR     Filter comments by author name or email (case-insensitive)
    --since DATE        Show comments created since date (YYYY-MM-DD or ISO format)
    --latest N          Show only the N most recent comments
    --include-system    Include system comments (default: only show user comments)
    --thread-status ST  Filter by thread status (active, fixed, wontFix, closed, byDesign, pending)
    -h, --help          Show this help message

EXAMPLES:
    Auto-discover from git remote (when in a git repo):
        ${scriptName} 23958

    Explicit project and repo:
        ${scriptName} 23958 --project Apollo --repo AHS

    Use full PR URL:
        ${scriptName} https://dev.azure.com/acme/MyProject/_git/MyRepo/pullrequest/23958

    Get latest 5 comments:
        ${scriptName} 23958 --latest 5

    Comments by specific author:
        ${scriptName} 23958 --author "john.doe@company.com"

    Comments since a specific date:
        ${scriptName} 23958 --since 2024-01-01

    JSON output for AI processing:
        ${scriptName} 23958 --format json

    Filter by thread status:
        ${scriptName} 23958 --thread-status active

    Include system comments:
        ${scriptName} 23958 --include-system

AUTO-DISCOVERY:
    When you run this tool from within a git repository with an Azure DevOps remote,
    it will automatically detect the organization, project, and repository from the
    git remote URL. Supports both SSH and HTTPS remotes:
    - SSH: git@ssh.dev.azure.com:v3/org/project/repo
    - HTTPS: https://dev.azure.com/org/project/_git/repo

SETUP:
    Set environment variables (recommended in ~/.vars or .env file):
    - AZURE_DEVOPS_ORG_URL (e.g., https://dev.azure.com/acme)
    - AZURE_DEVOPS_PAT (your Personal Access Token)
    - AZURE_DEVOPS_AUTH_METHOD (optional, default: pat)
    - AZURE_DEVOPS_DEFAULT_PROJECT (optional, fallback project name)

    Generate a PAT at: https://dev.azure.com/yourorg/_usersSettings/tokens
    Required scopes: Code (Read)

REQUIREMENTS:
    - Bun runtime
    - Azure DevOps PAT with appropriate permissions

OUTPUT FORMATS:
    text        Human-readable format (default)
    json        Structured JSON for AI/script processing
    markdown    Formatted markdown for documentation
`);
}

function filterComments(
  comments: Array<any>,
  filter: {
    author?: string;
    sinceDate?: string;
    latest?: number;
    includeSystem?: boolean;
    threadStatus?: string;
  }
): Array<any> {
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

function formatOutput(
  comments: Array<any>,
  format: 'text' | 'json' | 'markdown',
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

async function main() {
  const args = process.argv.slice(2);
  const {
    prId: argPrId,
    prUrl,
    project: argProject,
    repo: argRepo,
    help,
    format,
    author,
    sinceDate,
    latest,
    includeSystem,
    threadStatus,
  } = parseArgs(args);

  if (help) {
    showHelp();
    process.exit(0);
  }

  let prId: number | undefined = argPrId;
  let project: string | undefined = argProject;
  let repo: string | undefined = argRepo;

  // Parse PR URL if provided
  if (prUrl) {
    const parsed = parsePRUrl(prUrl);
    if (!parsed) {
      console.error(`Error: Invalid Azure DevOps PR URL: ${prUrl}`);
      console.error(
        'Expected format: https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}'
      );
      process.exit(1);
    }
    prId = parsed.prId;
    project = parsed.project;
    repo = parsed.repo;
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

  // Validate we have all required info
  if (!prId) {
    console.error('Error: PR ID is required.');
    console.error('');
    console.error('Usage: ado-get-pr-comments PR_ID [OPTIONS]');
    console.error('   or: ado-get-pr-comments PR_URL [OPTIONS]');
    console.error('');
    console.error('For more help: ado-get-pr-comments --help');
    process.exit(1);
  }

  if (!project || !repo) {
    console.error('Error: Could not determine project and repository.');
    console.error('');
    console.error('Either:');
    console.error(
      '  1. Run this command from within a git repository with Azure DevOps remote'
    );
    console.error('  2. Specify --project and --repo flags explicitly');
    console.error('  3. Provide a full PR URL');
    console.error('');
    console.error('For more help: ado-get-pr-comments --help');
    process.exit(1);
  }

  try {
    const config = loadAzureDevOpsConfig();
    const client = new AzureDevOpsClient(config);

    if (format !== 'json') {
      console.log(`Fetching comments for PR #${prId}...`);
      if (author) console.log(`Filtering by author: ${author}`);
      if (sinceDate) console.log(`Since date: ${sinceDate}`);
      if (latest) console.log(`Latest: ${latest} comments`);
      if (threadStatus) console.log(`Thread status: ${threadStatus}`);
      console.log('');
    }

    // Fetch all comments
    const allComments = await client.getAllComments(project, repo, prId);

    // Apply filters
    const filtered = filterComments(allComments, {
      author,
      sinceDate,
      latest,
      includeSystem,
      threadStatus,
    });

    // Format and output
    const output = formatOutput(filtered, format || 'text', prId);
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
