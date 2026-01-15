/**
 * Valibot schema for Jira fields command arguments
 */

import * as v from 'valibot';
import { OutputFormatSchema, NonEmptyStringSchema } from '@schemas/common.js';

/**
 * Field filter options
 */
export const FieldFilterSchema = v.picklist(
  ['all', 'required', 'optional', 'custom', 'system'],
  'Filter must be one of: all, required, optional, custom, system'
);

/**
 * Schema for fields command arguments
 */
export const FieldsArgsSchema = v.object({
  project: NonEmptyStringSchema,
  type: v.optional(v.string()),
  filter: v.optional(FieldFilterSchema, 'all'),
  showValues: v.optional(v.boolean(), false),
  maxValues: v.optional(v.number(), 10),
  format: v.optional(OutputFormatSchema, 'text'),
});

export type FieldsArgs = v.InferOutput<typeof FieldsArgsSchema>;
export type FieldFilter = v.InferOutput<typeof FieldFilterSchema>;
