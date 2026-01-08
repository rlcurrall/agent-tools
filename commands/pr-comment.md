---
description: Post comment on PR
allowed-tools: Bash(aide:*)
---

Post a comment on a pull request thread.

## Usage

`/aide:pr-comment "comment text"` - Auto-detect PR from current branch
`/aide:pr-comment "comment text" --pr <id>` - Comment on specific PR
`/aide:pr-comment "comment" --file src/app.ts --line 42` - Comment on a specific file/line

## Execution

Run the following command with the provided arguments:

```bash
aide pr comment $ARGUMENTS
```

## Flags

| Flag     | Description                                         |
| -------- | --------------------------------------------------- |
| `--pr`   | PR ID or URL (auto-detected from branch if omitted) |
| `--file` | File path to attach comment to                      |
| `--line` | Line number in file (requires `--file`)             |

## Output

Displays the posted comment details including:

1. Thread ID
2. Comment content
3. File and line location (if specified)
4. Timestamp

## Workflow

Use comments to:

1. **Respond to feedback**: Reply to reviewer comments with explanations
2. **Request review**: Add a comment when changes are ready for re-review
3. **Ask questions**: Clarify requirements or implementation approaches
4. **Document decisions**: Record architectural or design decisions

## Examples

```bash
# General PR comment (auto-detect PR from branch)
aide pr comment "Ready for re-review after addressing all feedback"

# Comment on specific PR
aide pr comment "LGTM!" --pr 24094

# Comment on specific line
aide pr comment "Added null check as suggested" --pr 24094 --file src/utils/helpers.ts --line 127
```
