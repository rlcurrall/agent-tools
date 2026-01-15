---
description: Discover available Jira fields for a project and issue type
---

# /aide:ticket-fields - Jira Field Discovery

Use this command to discover what fields are available when creating or updating Jira tickets.

## Usage

```bash
# List all fields for a project
aide jira fields <PROJECT>

# List fields for a specific issue type
aide jira fields <PROJECT> -t "Issue Type"

# Show only required fields
aide jira fields <PROJECT> -t Task --filter required

# Show allowed values for select fields
aide jira fields <PROJECT> -t Bug --show-values

# Get JSON output for programmatic use
aide jira fields <PROJECT> -t Story --format json
```

## Options

- `<project>` - Required. The project key (e.g., VNT, PROJ)
- `-t, --type` - Issue type name (e.g., Task, Bug, Story). If omitted, shows fields across all types.
- `-f, --filter` - Filter fields: `all`, `required`, `optional`, `custom`, `system`
- `-v, --show-values` - Display allowed values for select/option fields
- `--max-values` - Maximum values to display per field (default: 10)
- `--format` - Output format: `text`, `json`, `markdown`

## Examples

### List required fields for a Bug

```bash
aide jira fields VNT -t Bug --filter required
```

### Show custom fields with their allowed values

```bash
aide jira fields VNT -t "Regression Defect" --filter custom --show-values
```

### Get full field metadata as JSON

```bash
aide jira fields VNT -t Task --format json --show-values
```

## When to Use

1. Before creating tickets - discover what fields are available and required
2. When encountering "field not found" errors - find the correct field name
3. When unsure of allowed values - see valid options for select fields
4. For AI agents - get structured field metadata for ticket creation

## Integration with Create/Update

Once you discover field names using this command, you can use them directly with `/aide:ticket-create` or `/aide:ticket-update`:

```bash
# Discover available fields
aide jira fields VNT -t Bug --filter custom --show-values
# Output shows: Severity (customfield_10269) - select
#   Values: Critical, High, Medium, Low

# Use the field name in create/update (auto-resolved to customfield_10269)
aide jira create -p VNT -t Bug -s "My bug" --field "Severity=Critical"
aide jira update VNT-123 --field "Severity=High"
```

The `--field` flag automatically:
- Resolves field names to internal IDs
- Formats values based on field type (select, array, etc.)
- Validates values and shows allowed options on error
