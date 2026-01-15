/**
 * Field resolution utilities for Jira custom fields
 * Resolves human-readable field names to internal Jira field IDs
 */

import type { JiraClient } from './jira-client.js';
import type { JiraFieldMeta, AllowedValue } from './types.js';

// Re-export AllowedValue for backward compatibility with modules that import from field-resolver
export type { AllowedValue } from './types.js';

/**
 * Resolved field with metadata
 */
export interface ResolvedField {
  /** Original name provided by user */
  originalName: string;
  /** Resolved internal field key (e.g., "customfield_10269") */
  key: string;
  /** Display name from Jira */
  displayName: string;
  /** Field type from schema */
  type: string;
  /** Whether this is a custom field */
  isCustom: boolean;
  /** Full field metadata for value formatting */
  metadata: JiraFieldMeta;
}

/**
 * Result of field resolution attempt
 */
export interface FieldResolutionResult {
  success: boolean;
  resolved?: ResolvedField;
  error?: string;
  suggestions?: string[];
}

/**
 * Cache for field metadata to avoid repeated API calls
 */
const fieldMetadataCache = new Map<string, Map<string, JiraFieldMeta>>();

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching field names
 *
 * Note: Non-null assertions are used throughout because the matrix is pre-allocated
 * with exact dimensions (b.length + 1) x (a.length + 1), and all indices used are
 * guaranteed to be within bounds by the loop constraints. TypeScript cannot infer
 * this from the Array.from initialization.
 */
function levenshteinDistance(a: string, b: string): number {
  // Create matrix with proper dimensions - all cells are initialized to 0
  const matrix: number[][] = Array.from({ length: b.length + 1 }, () =>
    Array.from({ length: a.length + 1 }, () => 0)
  );

  // Initialize first column: matrix[i][0] = i for all i
  for (let i = 0; i <= b.length; i++) {
    matrix[i]![0] = i;
  }
  // Initialize first row: matrix[0][j] = j for all j
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1, // insertion
          matrix[i - 1]![j]! + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Find similar field names for suggestions
 */
function findSimilarFieldNames(
  name: string,
  fields: Map<string, JiraFieldMeta>,
  maxSuggestions: number = 3
): string[] {
  const nameLower = name.toLowerCase();
  const candidates: Array<{ name: string; distance: number }> = [];

  for (const [, meta] of fields) {
    const fieldNameLower = meta.name.toLowerCase();
    const distance = levenshteinDistance(nameLower, fieldNameLower);

    // Only suggest if reasonably close (within 50% of target length)
    if (distance <= Math.max(3, Math.ceil(name.length * 0.5))) {
      candidates.push({ name: meta.name, distance });
    }
  }

  // Sort by distance and return top suggestions
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, maxSuggestions).map((c) => c.name);
}

/**
 * Generate cache key for project + issue type
 */
function getCacheKey(projectKey: string, issueType: string): string {
  return `${projectKey}:${issueType}`;
}

/**
 * Fetch and cache field metadata for a project and issue type
 */
export async function fetchFieldMetadata(
  client: JiraClient,
  projectKey: string,
  issueType: string
): Promise<Map<string, JiraFieldMeta>> {
  const cacheKey = getCacheKey(projectKey, issueType);

  // Check cache first
  const cached = fieldMetadataCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const createMeta = await client.getCreateMeta(projectKey);

  const project = createMeta.projects.find(
    (p) => p.key.toUpperCase() === projectKey.toUpperCase()
  );

  if (!project) {
    throw new Error(`Project '${projectKey}' not found`);
  }

  const issueTypeMeta = project.issuetypes.find(
    (it) => it.name.toLowerCase() === issueType.toLowerCase()
  );

  if (!issueTypeMeta) {
    const availableTypes = project.issuetypes.map((it) => it.name).join(', ');
    throw new Error(
      `Issue type '${issueType}' not found in project ${projectKey}. ` +
        `Available types: ${availableTypes}`
    );
  }

  // Build field map
  const fieldMap = new Map<string, JiraFieldMeta>();
  for (const [key, meta] of Object.entries(issueTypeMeta.fields)) {
    fieldMap.set(key, { ...meta, key });
  }

  // Cache and return
  fieldMetadataCache.set(cacheKey, fieldMap);
  return fieldMap;
}

/**
 * Check if a field name looks like an internal field ID
 */
function isInternalFieldId(name: string): boolean {
  return (
    /^customfield_\d+$/.test(name) ||
    // Standard Jira fields
    [
      'summary',
      'description',
      'assignee',
      'reporter',
      'priority',
      'status',
      'labels',
      'components',
      'fixVersions',
      'versions',
      'issuetype',
      'project',
      'parent',
      'duedate',
      'environment',
      'resolution',
      'resolutiondate',
      'created',
      'updated',
    ].includes(name)
  );
}

/**
 * Resolve a field name to its internal ID
 */
export async function resolveFieldName(
  client: JiraClient,
  projectKey: string,
  issueType: string,
  fieldName: string
): Promise<FieldResolutionResult> {
  // If already an internal ID, return as-is (but still fetch metadata for type info)
  if (isInternalFieldId(fieldName)) {
    try {
      const fields = await fetchFieldMetadata(client, projectKey, issueType);
      const meta = fields.get(fieldName);

      if (meta) {
        return {
          success: true,
          resolved: {
            originalName: fieldName,
            key: fieldName,
            displayName: meta.name,
            type: meta.schema.type,
            isCustom: fieldName.startsWith('customfield_'),
            metadata: meta,
          },
        };
      }
      // Field ID not in createmeta - might still work
      return {
        success: true,
        resolved: {
          originalName: fieldName,
          key: fieldName,
          displayName: fieldName,
          type: 'unknown',
          isCustom: fieldName.startsWith('customfield_'),
          metadata: {
            required: false,
            name: fieldName,
            key: fieldName,
            schema: { type: 'unknown' },
          },
        },
      };
    } catch {
      // Fall through - use the ID as-is
      return {
        success: true,
        resolved: {
          originalName: fieldName,
          key: fieldName,
          displayName: fieldName,
          type: 'unknown',
          isCustom: fieldName.startsWith('customfield_'),
          metadata: {
            required: false,
            name: fieldName,
            key: fieldName,
            schema: { type: 'unknown' },
          },
        },
      };
    }
  }

  // Fetch field metadata
  let fields: Map<string, JiraFieldMeta>;
  try {
    fields = await fetchFieldMetadata(client, projectKey, issueType);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch field metadata',
    };
  }

  // Search for matching field by name (case-insensitive)
  const fieldNameLower = fieldName.toLowerCase();

  for (const [key, meta] of fields) {
    if (meta.name.toLowerCase() === fieldNameLower) {
      return {
        success: true,
        resolved: {
          originalName: fieldName,
          key,
          displayName: meta.name,
          type: meta.schema.type,
          isCustom: key.startsWith('customfield_'),
          metadata: meta,
        },
      };
    }
  }

  // No exact match - provide suggestions
  const suggestions = findSimilarFieldNames(fieldName, fields);

  return {
    success: false,
    error: `Field '${fieldName}' not found in project ${projectKey} for issue type '${issueType}'`,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Resolve multiple field names and return a map of original name to resolved field
 */
export async function resolveFieldNames(
  client: JiraClient,
  projectKey: string,
  issueType: string,
  fieldNames: string[]
): Promise<{
  resolved: Map<string, ResolvedField>;
  errors: Array<{ name: string; error: string; suggestions?: string[] }>;
}> {
  const resolved = new Map<string, ResolvedField>();
  const errors: Array<{ name: string; error: string; suggestions?: string[] }> =
    [];

  for (const name of fieldNames) {
    const result = await resolveFieldName(client, projectKey, issueType, name);

    if (result.success && result.resolved) {
      resolved.set(name, result.resolved);
    } else {
      errors.push({
        name,
        error: result.error || 'Unknown error',
        suggestions: result.suggestions,
      });
    }
  }

  return { resolved, errors };
}

/**
 * Clear the field metadata cache
 * Useful for testing or when metadata may have changed
 */
export function clearFieldMetadataCache(): void {
  fieldMetadataCache.clear();
}

/**
 * Result of field value validation
 */
export interface ValueValidationResult {
  valid: boolean;
  normalizedValue?: unknown;
  error?: string;
  allowedValues?: AllowedValue[];
  suggestions?: string[];
}

/**
 * Find similar values using Levenshtein distance
 */
function findSimilarValues(
  value: string,
  allowedValues: AllowedValue[],
  maxSuggestions: number = 3
): string[] {
  const valueLower = value.toLowerCase();
  const candidates: Array<{ display: string; distance: number }> = [];

  for (const av of allowedValues) {
    // Check both name and value fields
    const displayValue = av.value || av.name;
    const displayLower = displayValue.toLowerCase();
    const distance = levenshteinDistance(valueLower, displayLower);

    // Only suggest if reasonably close
    if (distance <= Math.max(3, Math.ceil(value.length * 0.5))) {
      candidates.push({ display: displayValue, distance });
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, maxSuggestions).map((c) => c.display);
}

/**
 * Check if a value is valid for a field and provide helpful error if not
 */
export function validateFieldValue(
  field: ResolvedField,
  value: unknown
): ValueValidationResult {
  const allowedValues = field.metadata.allowedValues;

  // If no allowed values defined, assume any value is valid
  if (!allowedValues || allowedValues.length === 0) {
    return { valid: true, normalizedValue: value };
  }

  // For object values (already formatted), extract the comparison value
  let compareValue: string;
  if (typeof value === 'object' && value !== null) {
    const objValue = value as Record<string, unknown>;
    compareValue = String(objValue.value || objValue.name || objValue.id || '');
  } else {
    compareValue = String(value);
  }

  const compareLower = compareValue.toLowerCase();

  // Check for exact match (case-insensitive)
  for (const av of allowedValues) {
    if (
      av.name.toLowerCase() === compareLower ||
      (av.value && av.value.toLowerCase() === compareLower) ||
      av.id === compareValue
    ) {
      return { valid: true, normalizedValue: value };
    }
  }

  // No match - provide helpful error with suggestions
  const suggestions = findSimilarValues(compareValue, allowedValues);

  return {
    valid: false,
    error: `Invalid value "${compareValue}" for field "${field.displayName}"`,
    allowedValues,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Format allowed values for display
 */
export function formatAllowedValues(
  allowedValues: AllowedValue[],
  maxDisplay: number = 10
): string {
  const values = allowedValues.map((av) => av.value || av.name);

  if (values.length <= maxDisplay) {
    return values.join(', ');
  }

  const displayed = values.slice(0, maxDisplay);
  const remaining = values.length - maxDisplay;
  return `${displayed.join(', ')}, ... and ${remaining} more`;
}

/**
 * Validate all field values and return validation results
 */
export function validateFieldValues(
  resolvedFields: Map<string, ResolvedField>,
  fieldPairs: Array<{ name: string; value: unknown }>
): {
  valid: boolean;
  results: Map<string, ValueValidationResult>;
} {
  const results = new Map<string, ValueValidationResult>();
  let allValid = true;

  for (const { name, value } of fieldPairs) {
    const field = resolvedFields.get(name);
    if (!field) {
      // Field not resolved - skip validation
      results.set(name, { valid: true, normalizedValue: value });
      continue;
    }

    const result = validateFieldValue(field, value);
    results.set(name, result);

    if (!result.valid) {
      allValid = false;
    }
  }

  return { valid: allValid, results };
}

/**
 * Format validation errors with allowed values for display
 */
export function formatValidationErrors(
  results: Map<string, ValueValidationResult>
): string {
  const lines: string[] = [];

  for (const [, result] of results) {
    if (!result.valid && result.error) {
      lines.push(`Error: ${result.error}`);

      if (result.suggestions && result.suggestions.length > 0) {
        lines.push(`  Did you mean: ${result.suggestions[0]}?`);
      }

      if (result.allowedValues && result.allowedValues.length > 0) {
        lines.push(
          `  Valid options: ${formatAllowedValues(result.allowedValues)}`
        );
      }

      lines.push(''); // Blank line between errors
    }
  }

  return lines.join('\n').trimEnd();
}
