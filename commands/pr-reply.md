---
description: Reply to Azure DevOps PR thread
allowed-tools: Bash(aide:*)
---

Reply to an existing comment thread on an Azure DevOps pull request.

## Usage

`/aide:pr-reply "reply text" --thread <thread-id>` - Auto-detect PR, reply to thread
`/aide:pr-reply "reply text" --thread <thread-id> --pr <pr-id>` - Reply to specific PR's thread
`/aide:pr-reply "reply" --thread <thread-id> --parent <comment-id>` - Reply to specific comment in thread

## Execution

Run the following command with the provided arguments:

```bash
aide ado reply $ARGUMENTS
```

## Flags

| Flag       | Description                                         |
| ---------- | --------------------------------------------------- |
| `--thread` | Thread ID to reply to (required)                    |
| `--pr`     | PR ID or URL (auto-detected from branch if omitted) |
| `--parent` | Parent comment ID for nested replies                |

## Output

Displays the posted reply details including:

1. Thread ID
2. Reply content
3. Parent comment reference (if specified)
4. Timestamp

## Workflow

Use replies to:

1. **Address feedback**: Respond directly to reviewer comments
2. **Provide context**: Explain why changes were made a certain way
3. **Acknowledge comments**: Confirm you've seen and will address feedback
4. **Continue discussion**: Ask follow-up questions in the same thread

## Examples

```bash
# Reply to a thread (auto-detect PR from branch)
aide ado reply "Fixed as suggested in the latest commit" --thread 156

# Reply to specific PR's thread
aide ado reply "Done, please re-review" --thread 156 --pr 24094

# Reply to specific comment in a thread
aide ado reply "Good point, I've updated the implementation" --thread 156 --parent 789 --pr 24094
```

## Finding Thread IDs

Use `/aide:pr-comments` to load PR comments, which displays thread IDs for each comment thread. Look for the thread ID in the output to use with this command.
