/**
 * Embedded Plugin Files
 *
 * This module imports all plugin files explicitly for Bun's file embedding.
 * These files are bundled into the compiled binary and can be extracted
 * at runtime to install the Claude Code plugin.
 *
 * Note: Using explicit imports instead of globs for Windows compatibility.
 * Type declarations for the `with { type: 'file' }` imports are in
 * src/bun-file-types.d.ts.
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

// =============================================================================
// Embedded File Imports
// =============================================================================
// The `with { type: 'file' }` syntax is Bun's file embedding feature.
// These imports resolve to internal file paths at build time when using
// `bun build --compile`. At runtime, use `Bun.file(path)` to read them.

// Plugin manifest files
import pluginJson from '../../.claude-plugin/plugin.json' with { type: 'file' };
import marketplaceJson from '../../.claude-plugin/marketplace.json' with { type: 'file' };

// Command definition files
import ticketMd from '../../commands/ticket.md' with { type: 'file' };
import searchMd from '../../commands/search.md' with { type: 'file' };
import commentMd from '../../commands/comment.md' with { type: 'file' };
import updateMd from '../../commands/update.md' with { type: 'file' };
import prMd from '../../commands/pr.md' with { type: 'file' };

// Skill definition files
import aideSkillMd from '../../skills/aide/SKILL.md' with { type: 'file' };

// =============================================================================
// Types and Manifest
// =============================================================================

/**
 * Represents an embedded file with its target installation path
 */
export interface EmbeddedFile {
  /** Relative path where file should be installed (from target directory) */
  targetPath: string;
  /** Embedded file path (resolved at build time) */
  sourcePath: string;
}

/**
 * Manifest of all embedded plugin files
 * Maps target installation paths to their embedded source paths
 */
export const embeddedPluginFiles: EmbeddedFile[] = [
  // Plugin manifests (cast needed: TS JSON resolution takes precedence over file embedding types)
  {
    targetPath: '.claude-plugin/plugin.json',
    sourcePath: pluginJson as unknown as string,
  },
  {
    targetPath: '.claude-plugin/marketplace.json',
    sourcePath: marketplaceJson as unknown as string,
  },

  // Command definitions
  { targetPath: 'commands/ticket.md', sourcePath: ticketMd },
  { targetPath: 'commands/search.md', sourcePath: searchMd },
  { targetPath: 'commands/comment.md', sourcePath: commentMd },
  { targetPath: 'commands/update.md', sourcePath: updateMd },
  { targetPath: 'commands/pr.md', sourcePath: prMd },

  // Skill definitions
  { targetPath: 'skills/aide/SKILL.md', sourcePath: aideSkillMd },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Ensures a directory exists, creating it recursively if needed
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
    if ((error as Error & { code?: string }).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Extracts all embedded plugin files to a target directory
 *
 * @param targetDir - The directory where plugin files should be extracted
 * @param options - Optional configuration
 * @param options.overwrite - If true, overwrites existing files (default: true)
 * @param options.verbose - If true, logs progress (default: false)
 * @returns Promise that resolves when all files are extracted
 *
 * @example
 * ```typescript
 * // Extract to current directory
 * await extractPluginFiles(process.cwd());
 *
 * // Extract to specific directory with logging
 * await extractPluginFiles('/path/to/project', { verbose: true });
 * ```
 */
export async function extractPluginFiles(
  targetDir: string,
  options: { overwrite?: boolean; verbose?: boolean } = {}
): Promise<void> {
  const { overwrite = true, verbose = false } = options;

  for (const file of embeddedPluginFiles) {
    const targetPath = path.join(targetDir, file.targetPath);
    const targetDirPath = path.dirname(targetPath);

    // Ensure parent directory exists
    await ensureDir(targetDirPath);

    // Check if file exists and skip if not overwriting
    if (!overwrite) {
      try {
        await fs.access(targetPath);
        if (verbose) {
          console.log(`Skipping (exists): ${file.targetPath}`);
        }
        continue;
      } catch {
        // File doesn't exist, proceed with extraction
      }
    }

    // Read from embedded file and write to target
    const content = await Bun.file(file.sourcePath).text();
    await Bun.write(targetPath, content);

    if (verbose) {
      console.log(`Extracted: ${file.targetPath}`);
    }
  }
}

/**
 * Gets the content of an embedded file by its target path
 *
 * @param targetPath - The target path of the file (e.g., 'commands/ticket.md')
 * @returns The file content as a string, or null if not found
 *
 * @example
 * ```typescript
 * const content = await getEmbeddedFileContent('commands/ticket.md');
 * if (content) {
 *   console.log(content);
 * }
 * ```
 */
export async function getEmbeddedFileContent(
  targetPath: string
): Promise<string | null> {
  const file = embeddedPluginFiles.find((f) => f.targetPath === targetPath);
  if (!file) {
    return null;
  }
  return await Bun.file(file.sourcePath).text();
}

/**
 * Lists all embedded plugin files
 *
 * @returns Array of target paths for all embedded files
 *
 * @example
 * ```typescript
 * const files = listEmbeddedFiles();
 * // ['commands/ticket.md', 'commands/search.md', ...]
 * ```
 */
export function listEmbeddedFiles(): string[] {
  return embeddedPluginFiles.map((f) => f.targetPath);
}
