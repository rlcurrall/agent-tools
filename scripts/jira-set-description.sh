#!/bin/bash

# Jira Set Description Script - Wrapper for Bun implementation
# This script calls the Bun-based implementation in agent-tools/

# Source credentials if available
if [ -f ~/.vars ]; then
    source ~/.vars
fi

# Check if bun is available
if ! command -v bun &> /dev/null; then
    echo "Error: 'bun' is required but not installed."
    echo "Install it with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Get script directory and parent directory (agent-tools root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_TOOLS_DIR="$(dirname "$SCRIPT_DIR")"

# Pass all arguments to the Bun implementation
exec bun run "$AGENT_TOOLS_DIR/src/jira-set-description.ts" "$@"
