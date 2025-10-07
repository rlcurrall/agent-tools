# AI Agent Tools

Command-line tools designed for AI coding agents (like Claude Code) to interact with Jira and Azure DevOps APIs.

## Structure

- `src/` - TypeScript source files
  - **Jira tools:** `jira-search.ts`, `jira-get-ticket.ts`, `jira-comment.ts`, `jira-get-comments.ts`
  - **Azure DevOps tools:** `ado-list-prs.ts`, `ado-get-pr-comments.ts`
  - **API clients:** `jira-client.ts`, `azure-devops-client.ts`
  - **Utilities:** `config.ts`, `cli-utils.ts`, `ado-utils.ts`, `comment-utils.ts`, `adf-to-md.ts`, `md-to-adf.ts`
  - **Types:** `types.ts` - TypeScript interfaces
  - **Documentation:** `update-claude-docs.ts` - Updates global CLAUDE.md
- `scripts/` - Bash wrapper scripts that call the TypeScript implementations
- `STUB_CLAUDE.md` - Documentation template for syncing to user's global CLAUDE.md

## Quick Setup for Team Members

**One-command setup for Git Bash users:**

```bash
./setup.sh
```

This script will:
- Install dependencies
- Add scripts to your PATH via `~/.bashrc`
- Update your global `~/.claude/CLAUDE.md` with tool documentation
- Create a sample `~/.vars` credentials file

**After setup:**
1. Restart your terminal or run: `source ~/.bashrc`
2. Configure credentials in `~/.vars`
3. Test with: `jira-search.sh --help`

## Usage

Once set up, you can call the tools from anywhere:

```bash
jira-search.sh "assignee = currentUser()"
jira-get-ticket.sh PROJ-123
ado-list-prs.sh --status active
ado-get-pr-comments.sh 24094 --latest 5
```

Or call from the scripts directory:

```bash
./scripts/jira-search.sh "assignee = currentUser()"
./scripts/jira-get-ticket.sh PROJ-123
```

## Direct Usage (for development/testing)

```bash
cd agent-tools
bun install
cp .env.example .env  # configure credentials
bun run src/jira-search.ts "assignee = currentUser()"
bun run src/jira-get-ticket.ts PROJ-123
```

## Configuration

### Team Members (After Setup)
Configure credentials in `~/.vars` (created by setup script):

```bash
# Jira
export JIRA_URL="https://your-company.atlassian.net"
export JIRA_EMAIL="your-email@company.com"
export JIRA_API_TOKEN="your-api-token-here"

# Azure DevOps
export AZURE_DEVOPS_ORG_URL="https://dev.azure.com/yourorg"
export AZURE_DEVOPS_PAT="your-personal-access-token"
```

Then load credentials: `source ~/.vars`

### Development (Alternative)
Copy `.env.example` to `.env` and configure:

```bash
JIRA_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token-here
```

### Setup Options
The setup script supports several options:

```bash
./setup.sh                 # Full setup
./setup.sh --dry-run        # Preview changes
./setup.sh --skip-path      # Skip PATH configuration
./setup.sh --skip-claude    # Skip CLAUDE.md update
./setup.sh --force          # Overwrite existing config
./setup.sh --help           # Show detailed help
```
