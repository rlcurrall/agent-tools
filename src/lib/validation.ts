/**
 * Validation utilities for CLI argument parsing
 *
 * Provides helper functions for Valibot schema validation
 * with CLI-friendly error formatting.
 */

import * as v from 'valibot';

/**
 * Format Valibot validation issues into CLI-friendly error messages
 *
 * @param context - Description of what was being validated (e.g., "ticket arguments")
 * @param issues - Array of Valibot validation issues
 * @returns Formatted error string suitable for console.error()
 *
 * @example
 * // Output:
 * // Error: Invalid ticket arguments:
 * //   - ticketKey: Ticket key must match format PROJECT-123
 */
export function formatValidationError(
  context: string,
  issues: v.BaseIssue<unknown>[]
): string {
  const lines: string[] = [`Error: Invalid ${context}:`];

  for (const issue of issues) {
    // Build the path string (e.g., "user.email" or just the field name)
    const pathStr =
      issue.path?.map((p) => p.key).join('.') ||
      issue.path?.[0]?.key ||
      'value';

    lines.push(`  - ${pathStr}: ${issue.message}`);
  }

  return lines.join('\n');
}

/**
 * Validate data against a Valibot schema with automatic error handling
 *
 * On validation failure:
 * - Prints formatted error to stderr
 * - Exits process with code 1
 *
 * @param schema - Valibot schema to validate against
 * @param data - Data to validate
 * @param context - Description for error messages (e.g., "ticket arguments")
 * @returns Validated and transformed data (typed as schema output)
 *
 * @example
 * const args = validateArgs(TicketArgsSchema, rawArgs, 'ticket arguments');
 * // If validation fails, process exits
 * // If validation passes, args is typed correctly
 */
export function validateArgs<TSchema extends v.GenericSchema>(
  schema: TSchema,
  data: unknown,
  context: string
): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, data);

  if (!result.success) {
    console.error(formatValidationError(context, result.issues));
    process.exit(1);
  }

  return result.output;
}

/**
 * Validate data against a Valibot schema, returning result instead of exiting
 *
 * Use this when you need custom error handling or want to continue
 * execution after validation failure.
 *
 * @param schema - Valibot schema to validate against
 * @param data - Data to validate
 * @returns Valibot SafeParseResult with success flag and output/issues
 *
 * @example
 * const result = tryValidate(PrIdSchema, userInput);
 * if (!result.success) {
 *   // Custom error handling
 *   console.warn('Warning: ' + result.issues[0]?.message);
 * }
 */
export function tryValidate<TSchema extends v.GenericSchema>(
  schema: TSchema,
  data: unknown
): v.SafeParseResult<TSchema> {
  return v.safeParse(schema, data);
}
