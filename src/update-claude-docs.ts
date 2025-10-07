#!/usr/bin/env bun

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface UpdateResult {
  success: boolean;
  filePath: string;
  message: string;
}

/**
 * Update a CLAUDE.md file by replacing content between <agent-tools> tags
 * with the content from STUB_CLAUDE.md
 */
async function updateClaudeFile(
  targetPath: string,
  stubContent: string
): Promise<UpdateResult> {
  // Check if target file exists
  if (!existsSync(targetPath)) {
    return {
      success: false,
      filePath: targetPath,
      message: `File not found: ${targetPath}`,
    };
  }

  // Read target file
  const targetFile = Bun.file(targetPath);
  const targetContent = await targetFile.text();

  // Check if file has agent-tools tags
  const hasOpenTag = targetContent.includes('<agent-tools>');
  const hasCloseTag = targetContent.includes('</agent-tools>');

  if (!hasOpenTag || !hasCloseTag) {
    return {
      success: false,
      filePath: targetPath,
      message: `File does not contain <agent-tools>...</agent-tools> tags`,
    };
  }

  // Create backup
  const backupPath = `${targetPath}.backup`;
  await Bun.write(backupPath, targetContent);

  // Split content and reconstruct
  const beforeTag = targetContent.substring(
    0,
    targetContent.indexOf('<agent-tools>')
  );
  const afterTag = targetContent.substring(
    targetContent.indexOf('</agent-tools>') + '</agent-tools>'.length
  );

  const newContent = beforeTag + stubContent + afterTag;

  // Write updated content
  await Bun.write(targetPath, newContent);

  return {
    success: true,
    filePath: targetPath,
    message: `Updated successfully (backup created: ${backupPath})`,
  };
}

async function main() {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
DESCRIPTION:
    Update CLAUDE.md files with latest agent-tools documentation from STUB_CLAUDE.md

USAGE:
    update-claude-docs [TARGET_FILE]
    update-claude-docs -h | --help

ARGUMENTS:
    TARGET_FILE     Optional path to specific CLAUDE.md file to update

OPTIONS:
    -h, --help      Show this help message

BEHAVIOR:
    If TARGET_FILE is provided, updates only that specific file.
    Otherwise, updates both:
      - ~/bin/CLAUDE.md (project docs)
      - ~/.claude/CLAUDE.md (global docs)

    The script looks for <agent-tools>...</agent-tools> tags and replaces
    the content between them with the latest documentation from STUB_CLAUDE.md.

    A backup is created before updating (filename.backup)

EXAMPLES:
    Update all CLAUDE.md files:
        update-claude-docs

    Update specific file:
        update-claude-docs ~/.claude/CLAUDE.md

    Update project file only:
        update-claude-docs ~/bin/CLAUDE.md

REQUIREMENTS:
    - STUB_CLAUDE.md must exist in the parent directory
    - Target files must contain <agent-tools>...</agent-tools> tags

NOTES:
    To restore from backup: mv filename.backup filename
`);
    process.exit(0);
  }

  // Get script directory
  const scriptDir = import.meta.dir;
  const parentDir = dirname(scriptDir);
  const stubPath = join(parentDir, 'STUB_CLAUDE.md');

  // Check if stub file exists
  if (!existsSync(stubPath)) {
    console.error(`Error: STUB_CLAUDE.md not found at ${stubPath}`);
    process.exit(1);
  }

  // Read stub content
  const stubFile = Bun.file(stubPath);
  const stubContent = await stubFile.text();

  console.log('Agent Tools Documentation Updater');
  console.log('==================================');
  console.log('');

  const results: UpdateResult[] = [];

  // If specific file provided, update only that file
  if (args.length > 0) {
    const targetPath = args[0]!;
    const result = await updateClaudeFile(targetPath, stubContent);
    results.push(result);
  } else {
    // Update project CLAUDE.md
    const projectPath = join(parentDir, 'CLAUDE.md');
    if (existsSync(projectPath)) {
      console.log('Updating project CLAUDE.md...');
      const result = await updateClaudeFile(projectPath, stubContent);
      results.push(result);
      console.log('');
    }

    // Update global CLAUDE.md
    const homePath = process.env.HOME || process.env.USERPROFILE || '~';
    const globalPath = join(homePath, '.claude', 'CLAUDE.md');
    if (existsSync(globalPath)) {
      console.log('Updating global CLAUDE.md...');
      const result = await updateClaudeFile(globalPath, stubContent);
      results.push(result);
      console.log('');
    }
  }

  // Print results
  let hasErrors = false;
  for (const result of results) {
    if (result.success) {
      console.log(`✓ ${result.filePath}`);
      console.log(`  ${result.message}`);
    } else {
      console.error(`✗ ${result.filePath}`);
      console.error(`  ${result.message}`);
      hasErrors = true;
    }
    console.log('');
  }

  if (results.length === 0) {
    console.log('No CLAUDE.md files found to update.');
    console.log('');
    console.log('Expected locations:');
    console.log(`  - ${join(parentDir, 'CLAUDE.md')}`);
    console.log(
      `  - ${join(process.env.HOME || process.env.USERPROFILE || '~', '.claude', 'CLAUDE.md')}`
    );
  }

  console.log('Done!');
  console.log('');
  console.log('To restore from backup:');
  console.log('  mv filename.backup filename');

  process.exit(hasErrors ? 1 : 0);
}

// Only run if this file is executed directly
if (import.meta.main) {
  main();
}
