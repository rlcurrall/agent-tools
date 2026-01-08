/**
 * Valibot schema for Jira ticket command arguments
 */

import * as v from 'valibot';
import { OutputFormatSchema, TicketKeyLooseSchema } from '@schemas/common.js';

/**
 * Schema for ticket command arguments
 *
 * Uses loose ticket key validation - the command will warn but not fail
 * on non-standard ticket key formats, since Jira projects can have
 * custom configurations.
 */
export const TicketArgsSchema = v.object({
  ticketKey: TicketKeyLooseSchema,
  format: v.optional(OutputFormatSchema, 'text'),
});

export type TicketArgs = v.InferOutput<typeof TicketArgsSchema>;
