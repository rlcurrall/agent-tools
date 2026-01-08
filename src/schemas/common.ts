/**
 * Common Valibot schemas for CLI argument validation
 *
 * These schemas are reused across Jira and Azure DevOps commands
 * to validate arguments like ticket keys, PR IDs, and output formats.
 */

import * as v from 'valibot';

// ============================================================================
// Output Format Schema
// ============================================================================

/**
 * Output format options for CLI commands
 * - text: Human-readable format (default)
 * - json: Structured data for AI/script processing
 * - markdown: Documentation-friendly format
 */
export const OutputFormatSchema = v.picklist(
  ['text', 'json', 'markdown'],
  'Output format must be one of: text, json, markdown'
);

export type OutputFormat = v.InferOutput<typeof OutputFormatSchema>;

// ============================================================================
// Ticket Key Schemas
// ============================================================================

/**
 * Strict Jira ticket key validation (e.g., "PROJ-123")
 * - Project key must be uppercase letters
 * - Followed by a hyphen
 * - Followed by one or more digits
 */
export const TicketKeySchema = v.pipe(
  v.string('Ticket key must be a string'),
  v.regex(
    /^[A-Z]+-\d+$/,
    'Ticket key must match format PROJECT-123 (uppercase letters, hyphen, number)'
  )
);

export type TicketKey = v.InferOutput<typeof TicketKeySchema>;

/**
 * Loose ticket key validation - just requires a non-empty string
 * Use this when you want to allow invalid formats with a warning
 * rather than hard validation failure
 */
export const TicketKeyLooseSchema = v.pipe(
  v.string('Ticket key must be a string'),
  v.minLength(1, 'Ticket key cannot be empty')
);

export type TicketKeyLoose = v.InferOutput<typeof TicketKeyLooseSchema>;

/**
 * Check if a ticket key matches the standard Jira format
 * Returns true for valid format, false otherwise
 * Use this for soft validation where you want to warn but not fail
 */
export function isValidTicketKeyFormat(key: string): boolean {
  return /^[A-Z]+-\d+$/.test(key);
}

// ============================================================================
// PR and Thread ID Schemas
// ============================================================================

/**
 * Azure DevOps PR ID schema
 * Accepts string or number, transforms to positive integer
 */
export const PrIdSchema = v.pipe(
  v.union([
    v.string('PR ID must be a string or number'),
    v.number('PR ID must be a string or number'),
  ]),
  v.transform((val): number => {
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return num;
  }),
  v.integer('PR ID must be an integer'),
  v.minValue(1, 'PR ID must be a positive integer')
);

export type PrId = v.InferOutput<typeof PrIdSchema>;

/**
 * Thread ID schema for PR comments
 * Accepts string or number, transforms to positive integer
 */
export const ThreadIdSchema = v.pipe(
  v.union([
    v.string('Thread ID must be a string or number'),
    v.number('Thread ID must be a string or number'),
  ]),
  v.transform((val): number => {
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    return num;
  }),
  v.integer('Thread ID must be an integer'),
  v.minValue(1, 'Thread ID must be a positive integer')
);

export type ThreadId = v.InferOutput<typeof ThreadIdSchema>;

// ============================================================================
// Generic Validation Schemas
// ============================================================================

/**
 * Non-empty string validation
 * Requires at least 1 character after trimming would still be checked,
 * but we don't auto-trim to preserve intentional whitespace
 */
export const NonEmptyStringSchema = v.pipe(
  v.string('Value must be a string'),
  v.minLength(1, 'Value cannot be empty')
);

export type NonEmptyString = v.InferOutput<typeof NonEmptyStringSchema>;

/**
 * Positive integer validation (>= 1)
 * Use for counts, IDs, and other values that must be at least 1
 */
export const PositiveIntegerSchema = v.pipe(
  v.number('Value must be a number'),
  v.integer('Value must be an integer'),
  v.minValue(1, 'Value must be a positive integer (>= 1)')
);

export type PositiveInteger = v.InferOutput<typeof PositiveIntegerSchema>;

/**
 * Non-negative integer validation (>= 0)
 * Use for offsets, indexes, and other values that can be zero
 */
export const NonNegativeIntegerSchema = v.pipe(
  v.number('Value must be a number'),
  v.integer('Value must be an integer'),
  v.minValue(0, 'Value must be a non-negative integer (>= 0)')
);

export type NonNegativeInteger = v.InferOutput<typeof NonNegativeIntegerSchema>;
