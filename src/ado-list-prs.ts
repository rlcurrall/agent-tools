#!/usr/bin/env bun

import { loadAzureDevOpsConfig } from './config.js';
import { AzureDevOpsClient } from './azure-devops-client.js';
import { discoverRepoInfo } from './ado-utils.js';

interface ListPRsArgs {
  project?: string;
  repo?: string;
  help?: boolean;
  format?: 'text' | 'json' | 'markdown';
  status?: 'active' | 'completed' | 'abandoned' | 'all';
  limit?: number;
  createdBy?: string;
}

function parseArgs(args: string[]): ListPRsArgs {
  const result: ListPRsArgs = {
    format: 'text',
    status: 'active',
    limit: 20,
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
    } else if (arg === '--status') {
      if (i + 1 < args.length) {
        const status = args[i + 1] as
          | 'active'
          | 'completed'
          | 'abandoned'
          | 'all';
        if (['active', 'completed', 'abandoned', 'all'].includes(status)) {
          result.status = status;
        }
        i++;
      }
    } else if (arg === '--limit') {
      if (i + 1 < args.length && args[i + 1]) {
        const limit = parseInt(args[i + 1]!, 10);
        if (!isNaN(limit) && limit > 0) {
          result.limit = limit;
        }
        i++;
      }
    } else if (arg === '--created-by' || arg === '--author') {
      if (i + 1 < args.length) {
        result.createdBy = args[i + 1];
        i++;
      }
    }
  }

  return result;
}

function showHelp(scriptName: string = 'ado-list-prs') {
  console.log(`
DESCRIPTION:
    List pull requests from an Azure DevOps repository with filtering options.
    Auto-discovers project and repository from git remote when in a git repository.
    Designed for AI integration and automated workflows.

USAGE:
    ${scriptName} [OPTIONS]
    ${scriptName} --project PROJECT --repo REPO [OPTIONS]
    ${scriptName} -h | --help

OPTIONS:
    --project PROJECT   Azure DevOps project name (auto-discovered from git remote if not specified)
    --repo REPO         Repository name (auto-discovered from git remote if not specified)
    --format FORMAT     Output format: text, json, or markdown (default: text)
    --status STATUS     Filter by status: active, completed, abandoned, all (default: active)
    --limit N           Maximum number of PRs to return (default: 20)
    --created-by USER   Filter by creator email or display name (partial match)
    --author USER       Alias for --created-by
    -h, --help          Show this help message

EXAMPLES:
    List active PRs (auto-discover from git remote):
        ${scriptName}

    List all PRs including completed:
        ${scriptName} --status all

    List your active PRs:
        ${scriptName} --created-by "your.email@company.com"

    List top 10 completed PRs:
        ${scriptName} --status completed --limit 10

    JSON output for AI processing:
        ${scriptName} --format json

    Explicit project and repo:
        ${scriptName} --project Apollo --repo AHS

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

function formatOutput(
  prs: Array<any>,
  format: 'text' | 'json' | 'markdown',
  repoInfo?: { project: string; repo: string }
): string {
  if (format === 'json') {
    return JSON.stringify(prs, null, 2);
  }

  if (prs.length === 0) {
    return format === 'markdown'
      ? `# Pull Requests\n\nNo pull requests found.`
      : `No pull requests found.`;
  }

  if (format === 'markdown') {
    let output = `# Pull Requests`;
    if (repoInfo) {
      output += ` - ${repoInfo.project}/${repoInfo.repo}`;
    }
    output += `\n\nTotal: ${prs.length} PR${prs.length === 1 ? '' : 's'}\n\n`;

    for (const pr of prs) {
      const date = new Date(pr.creationDate).toISOString().split('T')[0];
      output += `## #${pr.pullRequestId}: ${pr.title}\n`;
      output += `**Status:** ${pr.status} | **Created:** ${date} | **By:** ${pr.createdBy.displayName}\n`;
      if (pr.description) {
        output += `\n${pr.description}\n`;
      }
      output += `\n---\n\n`;
    }

    return output;
  }

  // Text format
  let output = `Pull Requests`;
  if (repoInfo) {
    output += ` - ${repoInfo.project}/${repoInfo.repo}`;
  }
  output += ` (${prs.length} total)\n`;
  output += '='.repeat(70) + '\n\n';

  for (const pr of prs) {
    const date = new Date(pr.creationDate).toLocaleDateString();
    output += `[PR #${pr.pullRequestId}] ${pr.title}\n`;
    output += `  Status: ${pr.status}\n`;
    output += `  Created: ${date} by ${pr.createdBy.displayName}\n`;
    if (pr.description) {
      const shortDesc =
        pr.description.length > 100
          ? pr.description.substring(0, 97) + '...'
          : pr.description;
      output += `  Description: ${shortDesc}\n`;
    }
    output += `\n`;
  }

  return output;
}

async function main() {
  const args = process.argv.slice(2);
  const {
    project: argProject,
    repo: argRepo,
    help,
    format,
    status,
    limit,
    createdBy,
  } = parseArgs(args);

  if (help) {
    showHelp();
    process.exit(0);
  }

  let project: string | undefined = argProject;
  let repo: string | undefined = argRepo;

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
  if (!project || !repo) {
    console.error('Error: Could not determine project and repository.');
    console.error('');
    console.error('Either:');
    console.error(
      '  1. Run this command from within a git repository with Azure DevOps remote'
    );
    console.error('  2. Specify --project and --repo flags explicitly');
    console.error('');
    console.error('For more help: ado-list-prs --help');
    process.exit(1);
  }

  try {
    const config = loadAzureDevOpsConfig();
    const client = new AzureDevOpsClient(config);

    if (format !== 'json') {
      console.log(`Fetching pull requests...`);
      if (status) console.log(`Status: ${status}`);
      if (createdBy) console.log(`Created by: ${createdBy}`);
      if (limit) console.log(`Limit: ${limit}`);
      console.log('');
    }

    // Fetch PRs
    const response = await client.listPullRequests(project, repo, {
      status,
      top: limit,
    });

    let prs = response.value;

    // Client-side filtering by creator (since API only supports ID, not name)
    if (createdBy) {
      const searchTerm = createdBy.toLowerCase();
      prs = prs.filter((pr) => {
        const displayName = pr.createdBy.displayName.toLowerCase();
        const uniqueName = pr.createdBy.uniqueName?.toLowerCase() || '';
        return (
          displayName.includes(searchTerm) || uniqueName.includes(searchTerm)
        );
      });
    }

    // Format and output
    const output = formatOutput(prs, format || 'text', { project, repo });
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
