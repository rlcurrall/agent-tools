# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Bun/TypeScript implementation of AI agent tools for interacting with Jira and Azure DevOps APIs. The tools are designed specifically for AI coding agents (like Claude Code) to automate development workflows, search tickets, manage pull requests, and read comments.

The architecture follows a **wrapper pattern**: bash scripts in the `scripts/` directory call TypeScript implementations in the `src/` directory. This allows for easy shell integration while maintaining type-safe, testable code. The scripts can be symlinked or copied to a directory in your PATH (e.g., `~/bin/`) for system-wide access.

## Development Commands

### Setup
```bash
bun install
```

### Linting and Formatting
```bash
bun run lint              # Run ESLint
bun run lint:fix          # Auto-fix linting issues
bun run format            # Format with Prettier
bun run format:check      # Check formatting
```

### Running Tools Directly (Development/Testing)
```bash
# Jira tools
bun run src/jira-search.ts "assignee = currentUser()"
bun run src/jira-get-ticket.ts PROJ-123
bun run src/jira-comment.ts PROJ-123 "Comment text"
bun run src/jira-get-comments.ts PROJ-123 --latest 5

# Azure DevOps tools
bun run src/ado-list-prs.ts --status active
bun run src/ado-get-pr-comments.ts 24094 --latest 5

# Documentation updater
bun run src/update-claude-docs.ts
```

## Architecture

### Core Components

**Configuration Layer (`config.ts`)**
- `loadConfig()` - Loads Jira credentials from environment variables
- `loadAzureDevOpsConfig()` - Loads Azure DevOps credentials
- Validates required environment variables on startup
- Supports both `.env` files (via Bun's auto-loading) and system environment variables

**API Clients**
- `jira-client.ts` - JiraClient class handles Jira REST API v3 calls with Basic Auth
- `azure-devops-client.ts` - AzureDevOpsClient handles Azure DevOps REST API 7.2 with PAT authentication

**CLI Tools** (all in `src/`)
Each tool follows the same pattern:
1. Parse command-line arguments
2. Load configuration
3. Create API client instance
4. Fetch/process data
5. Format output (text/json/markdown)
6. Handle errors gracefully

**Jira Tools:**
- `jira-search.ts` - JQL query execution
- `jira-get-ticket.ts` - Fetch ticket details with ADF-to-markdown conversion
- `jira-comment.ts` - Add comments (supports markdown-to-ADF conversion)
- `jira-get-comments.ts` - Retrieve and filter comments with multiple output formats

**Azure DevOps Tools:**
- `ado-list-prs.ts` - List PRs with filtering (status, author, limit)
- `ado-get-pr-comments.ts` - Fetch PR thread comments with auto-discovery from git remote
- `ado-utils.ts` - Git remote URL parsing (SSH/HTTPS) and PR URL parsing

**Utilities:**
- `adf-to-md.ts` - Convert Jira's Atlassian Document Format to Markdown
- `md-to-adf.ts` - Convert Markdown to Atlassian Document Format
- `comment-utils.ts` - Filter and format comment data
- `cli-utils.ts` - CLI argument validation and formatting helpers
- `types.ts` - TypeScript interfaces for Jira and Azure DevOps API responses

**Documentation System:**
- `update-claude-docs.ts` - Updates global `~/.claude/CLAUDE.md` by replacing content between `<agent-tools>` tags with content from `STUB_CLAUDE.md`
- `STUB_CLAUDE.md` - Template containing latest tool documentation

### Key Design Patterns

**Auto-Discovery:**
Azure DevOps tools automatically discover organization, project, and repository from git remote URLs:
- SSH format: `git@ssh.dev.azure.com:v3/{org}/{project}/{repo}`
- HTTPS format: `https://dev.azure.com/{org}/{project}/_git/{repo}`

**Multiple Output Formats:**
All tools support `--format` flag:
- `text` - Human-readable (default)
- `json` - Structured data for AI/script processing
- `markdown` - Documentation-friendly format

**Environment Configuration:**
Tools load credentials from environment variables with flexible naming:
- Jira: `JIRA_URL`, `JIRA_EMAIL`/`JIRA_USERNAME`, `JIRA_API_TOKEN`/`JIRA_TOKEN`
- Azure DevOps: `AZURE_DEVOPS_ORG_URL`, `AZURE_DEVOPS_PAT`, `AZURE_DEVOPS_AUTH_METHOD`

Bun automatically loads `.env` files from the working directory.

## Adding New Tools

When adding a new tool, follow this structure:

1. **Create TypeScript implementation** in `src/`:
   - Import `loadConfig()` or `loadAzureDevOpsConfig()`
   - Use appropriate client class (JiraClient/AzureDevOpsClient)
   - Implement argument parsing with `--help` flag
   - Support multiple output formats (`--format text|json|markdown`)
   - Add comprehensive help text
   - Export main function: `if (import.meta.main) { main(); }`

2. **Create bash wrapper** in `scripts/` directory (e.g., `scripts/your-tool.sh`):
   - Source `~/.vars` if it exists
   - Check for `bun` availability
   - Get script directory and determine path to TypeScript source (in parent's `src/` directory)
   - Call TypeScript implementation: `exec bun run "$AGENT_TOOLS_DIR/src/your-tool.ts" "$@"`

3. **Update documentation**:
   - Add tool description to `STUB_CLAUDE.md` in appropriate section
   - Add usage examples
   - Run `update-claude-docs.sh` to propagate changes

4. **Update types** in `types.ts` if needed for new API response structures

## Important Implementation Notes

**Jira ADF Conversion:**
Jira uses Atlassian Document Format (ADF) for rich text. The conversion utilities (`adf-to-md.ts`, `md-to-adf.ts`) handle bidirectional conversion. When displaying Jira content, always convert ADF to markdown for readability.

**Azure DevOps API Versions:**
Use API version `7.2-preview.1` for Azure DevOps endpoints. The preview version is required for PR threads/comments endpoints.

**Error Handling:**
All tools exit with status code 1 on errors and print user-friendly error messages to stderr. Configuration errors provide specific guidance on missing environment variables.

**Git Remote Detection:**
Azure DevOps tools use `spawnSync(['git', 'config', '--get', 'remote.origin.url'])` to detect repository context. This enables commands like `ado-list-prs.sh` to work without explicit project/repo parameters.

## Configuration Requirements

### Jira
```bash
export JIRA_URL="https://your-company.atlassian.net"
export JIRA_EMAIL="your-email@company.com"
export JIRA_API_TOKEN="your-api-token-here"
```

### Azure DevOps
```bash
export AZURE_DEVOPS_ORG_URL="https://dev.azure.com/yourorg"
export AZURE_DEVOPS_PAT="your-personal-access-token"
export AZURE_DEVOPS_AUTH_METHOD="pat"  # optional, default: pat
```

Credentials are typically stored in `~/.vars` which is sourced by wrapper scripts.
