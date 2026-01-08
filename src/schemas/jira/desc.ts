/**
 * Valibot schema for Jira desc command arguments
 */

import * as v from 'valibot';
import { OutputFormatSchema, TicketKeyLooseSchema } from '@schemas/common.js';

/**
 * Schema for desc command arguments
 *
 * Uses loose ticket key validation - the command will warn but not fail
 * on non-standard ticket key formats.
 *
 * Note: Either description or file must be provided, but this is validated
 * in the command handler since it requires runtime logic.
 */
export const DescArgsSchema = v.object({
  ticketKey: TicketKeyLooseSchema,
  description: v.optional(v.string()),
  file: v.optional(v.string()),
  format: v.optional(OutputFormatSchema, 'text'),
});

export type DescArgs = v.InferOutput<typeof DescArgsSchema>;
