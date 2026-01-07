// ============================================================================
// Atlassian Document Format (ADF) Types
// ============================================================================

/**
 * ADF Mark - formatting applied to text (bold, italic, links, etc.)
 */
export interface AdfMark {
  type: string;
  attrs?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * ADF Node - represents a single node in the ADF document tree
 */
export interface AdfNode {
  type: string;
  content?: AdfNode[];
  attrs?: Record<string, string | number | boolean | null | undefined>;
  text?: string;
  marks?: AdfMark[];
  version?: number;
}

/**
 * ADF Document - root node of an ADF document
 */
export interface AdfDocument extends AdfNode {
  type: 'doc';
  version: 1;
  content: AdfNode[];
}

/**
 * Input that can be converted to/from ADF - either a proper ADF document or a string
 */
export type AdfInput = AdfDocument | AdfNode | string | null | undefined;

// ============================================================================
// Jira Types
// ============================================================================

export interface JiraConfig {
  url: string;
  email: string;
  apiToken: string;
  defaultProject?: string;
}

export interface JiraUser {
  displayName: string;
  emailAddress: string;
  accountId: string;
}

export interface JiraStatus {
  name: string;
  id: string;
}

export interface JiraPriority {
  name: string;
  id: string;
}

export interface JiraProject {
  key: string;
  name: string;
  id: string;
}

export interface JiraIssueType {
  name: string;
  id: string;
}

export interface JiraAttachment {
  filename: string;
  size: number;
  author: JiraUser;
  created: string;
  mimeType: string;
}

export interface JiraComment {
  id: string;
  author: JiraUser;
  body: AdfNode | string;
  created: string;
  updated: string;
}

export interface JiraSubtask {
  key: string;
  fields: {
    summary: string;
    status: JiraStatus;
  };
}

export interface JiraIssueFields {
  key: string;
  summary: string;
  description?: AdfNode;
  status: JiraStatus;
  assignee?: JiraUser;
  reporter: JiraUser;
  priority: JiraPriority;
  project: JiraProject;
  issuetype: JiraIssueType;
  created: string;
  updated: string;
  resolutiondate?: string;
  comment?: {
    total: number;
    comments: JiraComment[];
  };
  attachment?: JiraAttachment[];
  subtasks?: JiraSubtask[];
}

export interface JiraIssue {
  key: string;
  fields: JiraIssueFields;
}

export interface JiraSearchResponse {
  total: number;
  issues: JiraIssue[];
  errorMessages?: string[];
  errors?: Record<string, string>;
}

export interface JiraIssueResponse extends JiraIssue {
  errorMessages?: string[];
  errors?: Record<string, string>;
}

/**
 * Response from Jira's GET /issue/{issueKey}/comment endpoint
 */
export interface JiraCommentsResponse {
  startAt: number;
  maxResults: number;
  total: number;
  comments: JiraComment[];
}

/**
 * Response from Jira's POST /issue/{issueKey}/comment endpoint
 */
export interface JiraAddCommentResponse extends JiraComment {}

// ============================================================================
// Azure DevOps Types
// ============================================================================

export interface AzureDevOpsConfig {
  orgUrl: string;
  pat: string;
  authMethod: 'pat' | 'bearer';
  defaultProject?: string;
}

export interface AzureDevOpsIdentity {
  displayName: string;
  uniqueName?: string;
  id: string;
}

export interface AzureDevOpsPRThread {
  id: number;
  publishedDate: string;
  lastUpdatedDate: string;
  comments: AzureDevOpsPRComment[];
  status: 'active' | 'fixed' | 'wontFix' | 'closed' | 'byDesign' | 'pending';
  threadContext?: {
    filePath?: string;
    rightFileStart?: { line: number; offset: number };
    rightFileEnd?: { line: number; offset: number };
  };
  properties?: unknown;
}

export interface AzureDevOpsPRComment {
  id: number;
  parentCommentId: number;
  author: AzureDevOpsIdentity;
  content: string;
  publishedDate: string;
  lastUpdatedDate: string;
  lastContentUpdatedDate: string;
  commentType: 'text' | 'system';
}

export interface AzureDevOpsRepository {
  id: string;
  name: string;
  project: {
    id: string;
    name: string;
  };
}

export interface AzureDevOpsPullRequest {
  pullRequestId: number;
  title: string;
  description?: string;
  status: 'active' | 'abandoned' | 'completed';
  createdBy: AzureDevOpsIdentity;
  creationDate: string;
  repository: AzureDevOpsRepository;
}

/**
 * Flattened comment structure from Azure DevOps PR threads
 * This is the structure returned by AzureDevOpsClient.getAllComments()
 */
export interface AdoFlattenedComment {
  threadId: number;
  threadStatus: string;
  filePath?: string;
  lineNumber?: number;
  comment: {
    id: number;
    parentCommentId: number;
    author: {
      displayName: string;
      uniqueName?: string;
      id: string;
    };
    content: string;
    publishedDate: string;
    lastUpdatedDate: string;
    commentType: string;
  };
}

// ============================================================================
// CLI Types
// ============================================================================

export interface CliOptions {
  help?: boolean;
}

export interface GitRemoteInfo {
  org: string;
  project: string;
  repo: string;
}
