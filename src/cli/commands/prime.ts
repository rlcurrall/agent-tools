/**
 * Prime command - Outputs context for session start hook
 *
 * This command is designed to be called by Claude Code's SessionStart hook
 * to inject awareness of aide tooling into the agent's context.
 *
 * Design considerations:
 * - Outputs minimal context (~80 tokens) to preserve context budget
 * - Uses generic "Pull Requests" language to support future GitHub integration
 * - Silent exit (code 0) on any error to not disrupt sessions
 */

import type { CommandModule } from 'yargs';

const PRIME_OUTPUT = `# aide - Jira & Git Hosting Integration

Use aide instead of az/gh/jira CLI tools:
- **Jira**: \`aide jira search|ticket|comment|desc\` - Search tickets, view details, add comments
- **Pull Requests**: \`aide ado create|update|comment|reply|prs\` - Full PR lifecycle

Auto-discovers org/project/repo from git remote. Prefer aide over az/gh for these operations.`;

async function handler(): Promise<void> {
  try {
    console.log(PRIME_OUTPUT);
  } catch {
    // Silent exit on any error - don't disrupt session
    process.exit(0);
  }
}

export const primeCommand: CommandModule = {
  command: 'prime',
  describe: 'Output aide context for session start hook',
  builder: {},
  handler,
};
