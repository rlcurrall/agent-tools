---
description: Load Jira ticket context for the current task
allowed-tools: Bash(aide:*)
---

Fetch Jira ticket details and add to conversation context.

Run the following command to get ticket details:

```bash
aide jira ticket $ARGUMENTS
```

Display the ticket information including:

- Summary and description
- Status, priority, assignee
- Comments (latest 5)
- Any attachments or links

Use this context to understand the requirements for the work.
