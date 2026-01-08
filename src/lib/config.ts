import * as v from 'valibot';
import {
  JiraConfigSchema,
  AzureDevOpsConfigSchema,
  type JiraConfig,
  type AzureDevOpsConfig,
} from '../schemas/config.js';

/**
 * Print helpful error message for Jira configuration issues
 */
function printJiraConfigError(field: string): void {
  console.error(`Error: Missing or invalid Jira configuration: ${field}`);
  console.error('Please set the following environment variables:');
  console.error('  - JIRA_URL (your Jira instance URL)');
  console.error('  - JIRA_EMAIL or JIRA_USERNAME (your email/username)');
  console.error('  - JIRA_API_TOKEN or JIRA_TOKEN (your API token)');
  console.error('');
  if (field.includes('apiToken') || field.includes('API token')) {
    console.error(
      'Generate an API token at: https://id.atlassian.com/manage-profile/security/api-tokens'
    );
  }
  console.error('You can also create a .env file (copy from .env.example)');
}

/**
 * Print helpful error message for Azure DevOps configuration issues
 */
function printAzureDevOpsConfigError(field: string): void {
  console.error(
    `Error: Missing or invalid Azure DevOps configuration: ${field}`
  );
  console.error('Please set the following environment variables:');
  console.error(
    '  - AZURE_DEVOPS_ORG_URL (e.g., https://dev.azure.com/yourorg)'
  );
  console.error('  - AZURE_DEVOPS_PAT (your Personal Access Token)');
  console.error(
    '  - AZURE_DEVOPS_AUTH_METHOD (optional, default: pat, can be: pat or bearer)'
  );
  console.error('');
  if (field.includes('pat') || field.includes('PAT')) {
    console.error(
      'Generate a PAT at: https://dev.azure.com/yourorg/_usersSettings/tokens'
    );
  }
  console.error('You can also create a .env file with these variables');
}

export function loadConfig(): JiraConfig {
  // Bun automatically loads .env files, so we can use Bun.env directly
  const rawConfig = {
    url: Bun.env.JIRA_URL,
    email: Bun.env.JIRA_EMAIL || Bun.env.JIRA_USERNAME,
    apiToken: Bun.env.JIRA_API_TOKEN || Bun.env.JIRA_TOKEN,
    defaultProject: Bun.env.JIRA_DEFAULT_PROJECT,
  };

  const result = v.safeParse(JiraConfigSchema, rawConfig);

  if (!result.success) {
    // Find the first issue and provide a helpful error message
    const firstIssue = result.issues[0];
    const fieldPath =
      firstIssue?.path?.map((p) => p.key).join('.') || 'configuration';
    printJiraConfigError(fieldPath);
    process.exit(1);
  }

  return result.output;
}

export function loadAzureDevOpsConfig(): AzureDevOpsConfig {
  // Bun automatically loads .env files, so we can use Bun.env directly
  const rawConfig = {
    orgUrl: Bun.env.AZURE_DEVOPS_ORG_URL,
    pat: Bun.env.AZURE_DEVOPS_PAT,
    authMethod: Bun.env.AZURE_DEVOPS_AUTH_METHOD || 'pat',
    defaultProject: Bun.env.AZURE_DEVOPS_DEFAULT_PROJECT,
  };

  const result = v.safeParse(AzureDevOpsConfigSchema, rawConfig);

  if (!result.success) {
    // Find the first issue and provide a helpful error message
    const firstIssue = result.issues[0];
    const fieldPath =
      firstIssue?.path?.map((p) => p.key).join('.') || 'configuration';
    printAzureDevOpsConfigError(fieldPath);
    process.exit(1);
  }

  return result.output;
}
