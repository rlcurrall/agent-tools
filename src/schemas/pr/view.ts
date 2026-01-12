/**
 * Valibot schema for PR view command arguments
 */

import * as v from 'valibot';
import { OutputFormatSchema, type OutputFormat } from '../common.js';

// Re-export OutputFormat for use in command files
export type { OutputFormat };

/**
 * Schema for PR view command arguments
 */
export const ViewArgsSchema = v.object({
  pr: v.optional(v.string()),
  project: v.optional(v.string()),
  repo: v.optional(v.string()),
  format: v.optional(OutputFormatSchema, 'text'),
});

export type ViewArgs = v.InferOutput<typeof ViewArgsSchema>;
