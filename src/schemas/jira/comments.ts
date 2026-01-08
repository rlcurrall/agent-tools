/**
 * Valibot schema for Jira comments command arguments
 */

import * as v from 'valibot';
import {
  OutputFormatSchema,
  TicketKeyLooseSchema,
  PositiveIntegerSchema,
} from '@schemas/common.js';

/**
 * Schema for comments command arguments
 *
 * Uses loose ticket key validation - the command will warn but not fail
 * on non-standard ticket key formats.
 */
export const CommentsArgsSchema = v.object({
  ticketKey: TicketKeyLooseSchema,
  format: v.optional(OutputFormatSchema, 'text'),
  author: v.optional(v.string()),
  since: v.optional(v.string()),
  latest: v.optional(PositiveIntegerSchema),
  maxResults: v.optional(PositiveIntegerSchema, 100),
  all: v.optional(v.boolean(), false),
});

export type CommentsArgs = v.InferOutput<typeof CommentsArgsSchema>;
