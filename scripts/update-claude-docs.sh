#!/bin/bash

# Update Claude Docs Script - Wrapper for Bun implementation
# This script calls the Bun-based implementation in agent-tools/

# Get script directory and navigate to parent (agent-tools root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_TOOLS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if agent-tools directory exists
if [ ! -d "$AGENT_TOOLS_DIR" ]; then
    echo "Error: agent-tools directory not found at $AGENT_TOOLS_DIR"
    echo "Please ensure the Bun implementation is properly installed."
    exit 1
fi

# Check if bun is available
if ! command -v bun &> /dev/null; then
    echo "Error: 'bun' is required but not installed."
    echo "Install it with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Pass all arguments to the Bun implementation
exec bun run "$AGENT_TOOLS_DIR/src/update-claude-docs.ts" "$@"
