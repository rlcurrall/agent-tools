<agent-tools>
# AI Agent Tools

Command-line tools designed for AI coding agents (like Claude Code) to interact with Jira and Azure DevOps APIs. These tools enable AI assistants to search tickets, manage pull requests, read comments, and automate development workflows.

## Jira Scripts

- **`jira-search.sh`** - Search for Jira tickets using JQL queries
- **`jira-get-ticket.sh`** - Get ticket details (summary, description, metadata)
- **`jira-set-description.sh`** - Set or update ticket description with markdown support
- **`jira-comment.sh`** - Add comments to tickets with markdown support
- **`jira-get-comments.sh`** - Retrieve and filter comments from tickets

## Azure DevOps Scripts

- **`ado-list-prs.sh`** - List pull requests in a repository with filtering
- **`ado-get-pr-comments.sh`** - Retrieve comments from Azure DevOps pull requests with auto-discovery

## Usage

Note that these scripts are available in the PATH, so you can run them directly from the command line.

### Search Tickets
```bash
# Basic searches
jira-search.sh "project = MYPROJ"
jira-search.sh "assignee = currentUser()"
jira-search.sh "status = Open"

# Advanced searches
jira-search.sh "project = MYPROJ AND status = 'In Progress'"
jira-search.sh "text ~ 'bug' AND created >= -30d"
jira-search.sh "priority = High AND assignee = 'john.doe'"

# Limit results
jira-search.sh "status = Open" 10
```

### Get Ticket Details
```bash
# Get ticket metadata, description, attachments, subtasks
jira-get-ticket.sh PROJ-123
jira-get-ticket.sh ABC-456
```

### Set Ticket Description
```bash
# Simple description
jira-set-description.sh PROJ-123 "This ticket implements user authentication"

# Markdown description
jira-set-description.sh PROJ-123 "# Overview

Implement OAuth 2.0 authentication

## Requirements

- [ ] Add login endpoint
- [ ] Implement token refresh
- [ ] Add session management

**Priority**: High"

# From markdown file
jira-set-description.sh PROJ-123 -f description.md
```

**Important:** `jira-set-description` completely REPLACES the existing description. To preserve existing content:
```bash
# 1. Get current description first
jira-get-ticket.sh PROJ-123 > current-description.txt

# 2. Edit the description as needed

# 3. Update with new content
jira-set-description.sh PROJ-123 -f new-description.md
```

### Add Comments
```bash
# Simple comment
jira-comment.sh PROJ-123 "Work completed and ready for review"

# Markdown comment
jira-comment.sh PROJ-123 "# Status Update

- [x] Completed implementation
- [ ] Pending code review

**Next steps**: Deploy to staging"

# From markdown file
jira-comment.sh PROJ-123 -f update.md
```

### Get Comments
```bash
# All comments from a ticket
jira-get-comments.sh PROJ-123

# Latest 5 comments
jira-get-comments.sh PROJ-123 --latest 5

# Comments by specific author
jira-get-comments.sh PROJ-123 --author "john.doe"

# JSON format for AI processing
jira-get-comments.sh PROJ-123 --format json --latest 10

# Comments since specific date
jira-get-comments.sh PROJ-123 --since 2024-01-01
```

### Get Help
```bash
jira-search.sh --help
jira-get-ticket.sh --help
jira-set-description.sh --help
jira-comment.sh --help
jira-get-comments.sh --help
```

## Azure DevOps Usage

### List Pull Requests
```bash
# List active PRs (auto-discover from git remote)
ado-list-prs.sh

# List all PRs including completed
ado-list-prs.sh --status all

# List your active PRs
ado-list-prs.sh --created-by "your.email@company.com"

# List top 10 completed PRs
ado-list-prs.sh --status completed --limit 10

# JSON output for AI processing
ado-list-prs.sh --format json

# Explicit project and repo
ado-list-prs.sh --project Apollo --repo AHS
```

### Get PR Comments
```bash
# Auto-discover from git remote (when in a git repo)
ado-get-pr-comments.sh 24094

# With explicit project and repo
ado-get-pr-comments.sh 24094 --project Apollo --repo AHS

# Use full PR URL
ado-get-pr-comments.sh https://dev.azure.com/acme/MyProject/_git/MyRepo/pullrequest/24094

# Latest 5 comments
ado-get-pr-comments.sh 24094 --latest 5

# Comments by specific author
ado-get-pr-comments.sh 24094 --author "john.doe@company.com"

# JSON format for AI processing
ado-get-pr-comments.sh 24094 --format json --latest 10

# Markdown format for documentation
ado-get-pr-comments.sh 24094 --format markdown

# Filter by thread status
ado-get-pr-comments.sh 24094 --thread-status active

# Include system comments
ado-get-pr-comments.sh 24094 --include-system

# Comments since specific date
ado-get-pr-comments.sh 24094 --since 2024-01-01
```

### Get Help
```bash
ado-list-prs.sh --help
ado-get-pr-comments.sh --help
```

## AI Integration Examples

### Azure DevOps PR Review Workflows

```bash
# List your active PRs and get comments from each
MY_PRS=$(ado-list-prs.sh --created-by "your.email" --format json | jq -r '.[].pullRequestId')
for pr in $MY_PRS; do
    echo "=== PR #$pr ==="
    ado-get-pr-comments.sh $pr --thread-status active
done

# Get all active PR comments for review
ado-get-pr-comments.sh 24094 --thread-status active --format json

# Extract unresolved comments from a PR
ado-get-pr-comments.sh 24094 --thread-status active | grep -v "fixed"

# Get latest feedback from code reviewers
ado-get-pr-comments.sh 24094 --latest 10 --format markdown

# Monitor specific reviewer's comments across PRs
for pr in 24094 24095 24096; do
    echo "=== PR $pr ==="
    ado-get-pr-comments.sh $pr --author "reviewer@company.com"
done

# Get comment summary for AI analysis
ado-get-pr-comments.sh 24094 --format json | jq '.[] | {author: .comment.author.displayName, file: .filePath, status: .threadStatus}'
```

### Jira Issue Tracking

### Find and Analyze High Priority Issues
```bash
# Get list of high priority tickets
TICKETS=$(jira-search.sh "priority = High AND status != Closed" | grep -E '^\[' | cut -d']' -f1 | cut -d'[' -f2)

# Get details for each
for ticket in $TICKETS; do
    echo "=== Analyzing $ticket ==="
    jira-get-ticket.sh "$ticket"
    echo ""
done
```

### Search and Extract Ticket Keys
```bash
# Get just the ticket keys for further processing
jira-search.sh "assignee = currentUser()" | grep -E '^\[' | cut -d']' -f1 | cut -d'[' -f2
```

### Pipeline for AI Analysis
```bash
# Search -> Extract keys -> Get details -> Process with AI
jira-search.sh "text ~ 'performance'" 5 | \
  grep -E '^\[' | cut -d']' -f1 | cut -d'[' -f2 | \
  xargs -I {} jira-get-ticket.sh {}
```

### Add Status Updates to Multiple Tickets
```bash
# Add comments to multiple tickets
TICKETS=$(jira-search.sh "assignee = currentUser() AND status = 'In Progress'" | grep -E '^\[' | cut -d']' -f1 | cut -d'[' -f2)

for ticket in $TICKETS; do
    jira-comment.sh "$ticket" "# Weekly Update

Status: Work in progress
ETA: End of sprint

cc: @team"
done
```

### Bulk Update Ticket Descriptions
```bash
# Standardize descriptions for tickets missing proper formatting
TICKETS=$(jira-search.sh "project = MYPROJ AND description IS NOT EMPTY" 50 | grep -E '^\[' | cut -d']' -f1 | cut -d'[' -f2)

for ticket in $TICKETS; do
    # Get current ticket details
    DETAILS=$(jira-get-ticket.sh "$ticket")

    # Extract and reformat description (AI can process and enhance here)
    # Then update with standardized format
    jira-set-description.sh "$ticket" "# Ticket: $ticket

## Description
[Enhanced description here]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Notes
[Technical details here]"

    echo "Updated $ticket"
done
```

### Update Descriptions from PR Information
```bash
# Update ticket description with PR details after merge
PR_ID="24094"
TICKET_KEY="PROJ-123"

# Get PR comments and details
PR_INFO=$(ado-get-pr-comments.sh "$PR_ID" --format markdown)

# Update ticket with implementation details
jira-set-description.sh "$TICKET_KEY" "# Implementation Complete

## Changes Made
$(echo "$PR_INFO" | grep -A 5 "Changes")

## PR Review
Completed in PR #$PR_ID

## Testing
All tests passing, code reviewed and approved."
```

### Extract and Analyze Comments for AI Processing
```bash
# Get recent comments from high-priority tickets for analysis
jira-search.sh "priority = High AND updated >= -7d" 10 | \
  grep -E '^\[' | cut -d']' -f1 | cut -d'[' -f2 | \
  xargs -I {} jira-get-comments.sh {} --latest 3 --format json

# Find all QA-related comments from recent tickets
TICKETS=$(jira-search.sh "updated >= -30d" 20 | grep -E '^\[' | cut -d']' -f1 | cut -d'[' -f2)
for ticket in $TICKETS; do
    jira-get-comments.sh "$ticket" --author "qa" --format text | grep -v "No comments"
done

# Get comment activity summary
jira-get-comments.sh PROJ-123 --format json | jq '.[] | {author: .author, date: .created, length: (.body | length)}'
```

## Common JQL Patterns

### Field Reference
- `project` - Project key or name
- `assignee` - User assignment (`currentUser()`, email, username)
- `reporter` - Who created the ticket
- `status` - Current status
- `priority` - Priority level
- `created`, `updated`, `resolved` - Date fields
- `text` - Full-text search across summary/description
- `summary` - Ticket title
- `description` - Ticket description
- `component` - Project components
- `fixVersion` - Target release version
- `labels` - Ticket labels
- `issuetype` - Type (Bug, Story, Task, etc.)

### Operators
- `=`, `!=` - Exact match
- `~`, `!~` - Contains/doesn't contain
- `>`, `<`, `>=`, `<=` - Comparisons
- `IN`, `NOT IN` - List membership
- `IS`, `IS NOT` - Null checks

### Date Functions
- `now()` - Current time
- `currentUser()` - Current logged-in user
- `startOfDay()`, `startOfWeek()`, `startOfMonth()` - Date boundaries
- `-1d`, `-1w`, `-1M` - Relative dates (days, weeks, months)

### Example Queries
```bash
# My open tickets
"assignee = currentUser() AND status != Closed"

# Recent bugs
"issuetype = Bug AND created >= -7d"

# High priority unassigned
"priority = High AND assignee IS EMPTY"

# Tickets updated this week
"updated >= startOfWeek()"

# Specific project and status
"project = MYPROJ AND status IN (Open, 'In Progress')"
```

## Output Formats

### Search Results
```
Found 3 issues (showing 3):

[PROJ-123] Fix login authentication bug
  Status: In Progress
  Assignee: John Doe
  Priority: High
  Created: 2024-01-15
  Updated: 2024-01-16

[PROJ-124] Update user dashboard
  Status: Open
  Assignee: Unassigned
  Priority: Medium
  Created: 2024-01-14
  Updated: 2024-01-14
```

### Ticket Details
```
=== PROJ-123: Fix login authentication bug ===

Project: My Project (PROJ)
Issue Type: Bug
Status: In Progress
Priority: High
Reporter: Jane Smith
Assignee: John Doe
Created: 2024-01-15T10:30:00.000Z
Updated: 2024-01-16T14:22:00.000Z

Description:
------------
Users are unable to login after the recent security update...

Comments (2):
----------
[2024-01-15] Jane Smith:
Initial bug report from customer support.

[2024-01-16] John Doe:
Working on a fix, should be ready by EOD.
```

## Azure DevOps Features

### Auto-Discovery
When running from within a git repository with an Azure DevOps remote, the tool automatically detects:
- Organization
- Project
- Repository

Supported remote formats:
- **SSH:** `git@ssh.dev.azure.com:v3/org/project/repo`
- **HTTPS:** `https://dev.azure.com/org/project/_git/repo`

### Output Formats

**Text (default):**
```
PR #24094 Comments (3 total)
==================================================

[9/29/2025, 5:24:27 PM] Keith Haertel
  Thread Status: fixed
  File: /path/to/file.cs:21
  Comment text here...
```

**JSON (for AI processing):**
```json
[
  {
    "threadId": 180707,
    "threadStatus": "fixed",
    "filePath": "/path/to/file.cs",
    "lineNumber": 21,
    "comment": {
      "id": 6,
      "author": {...},
      "content": "Comment text...",
      "publishedDate": "2025-09-29T21:24:27.67Z"
    }
  }
]
```

**Markdown (for documentation):**
```markdown
# PR #24094 Comments

## Keith Haertel (/path/to/file.cs:21)
**Date:** 2025-09-29 | **Status:** fixed

Comment text here...
```

## Requirements

- `bun` - Runtime for the tools
- `bash` - Shell environment

## Troubleshooting

### Azure DevOps Issues
- Verify PAT is valid and has Code (Read) scope
- Ensure AZURE_DEVOPS_ORG_URL is correct (e.g., https://dev.azure.com/yourorg)
- Check that you have permissions to view the PR
- Confirm project and repository names are correct (case-sensitive)

### Jira Issues

### Authentication Issues
- Verify API token is valid and not expired
- Check that email/username matches your Jira account
- Ensure JIRA_URL doesn't have a trailing slash

### Permission Issues
- Confirm you have access to view the requested tickets
- Check project permissions in Jira
- Verify ticket keys are correct (case-sensitive)

### Runtime Dependencies
```bash
# Install Bun if missing
curl -fsSL https://bun.sh/install | bash
```

## Design Philosophy

These tools are specifically designed for AI coding agents like Claude Code:
- **AI-First**: Simple, predictable interfaces that AI agents can easily understand and invoke
- **Single Purpose**: Each script does one thing well, making them easy for AI to reason about
- **Composable**: Designed to work together and with standard Unix tools for complex workflows
- **Multiple Output Formats**: Text for humans, JSON for AI processing, Markdown for documentation
- **Auto-Discovery**: Intelligent detection of context (git repos, projects) to minimize required parameters
- **Text Processing**: Output designed for further processing with standard tools like `jq`, `grep`, and `awk`

Perfect for AI-assisted development workflows with tools like Claude Code, Cursor, and GitHub Copilot.
</agent-tools>
