---
description: View pull request details
allowed-tools: Bash(aide:*)
---

View details of a pull request including title, description, status, author, and branches.

## Usage

`/aide:pr-view` - Auto-detect PR from current branch
`/aide:pr-view --pr <id>` - View specific PR by ID
`/aide:pr-view --pr <url>` - View PR from full URL

## Execution

Run the following command with the provided arguments:

```bash
aide pr view $ARGUMENTS
```

## Output

Display PR details including:

1. PR number and title
2. Status (active, completed, abandoned) and draft state
3. Author and creation date
4. Source and target branches
5. Repository and project
6. Description (if present)

## Workflow

After viewing PR details:

1. Understand the scope and purpose of the PR
2. Check if it's a draft or ready for review
3. Note the target branch for merge context
4. Use `/aide:pr-comments` to see feedback if needed
