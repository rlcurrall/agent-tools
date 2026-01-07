/**
 * docs update command
 * Updates CLAUDE.md files with latest tool documentation from STUB_CLAUDE.md
 */

import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';

export interface UpdateArgv {
  targetFile?: string;
}

interface UpdateResult {
  success: boolean;
  filePath: string;
  message: string;
}

/**
 * Find the STUB_CLAUDE.md file by traversing up from the current directory
 * or checking common locations
 */
function findStubFile(): string | null {
  // Try relative to this source file (development)
  const srcDir = dirname(import.meta.dir);
  const cliDir = dirname(srcDir);
  const projectRoot = dirname(cliDir);
  const stubFromSrc = join(projectRoot, 'STUB_CLAUDE.md');
  if (existsSync(stubFromSrc)) {
    return stubFromSrc;
  }

  // Try current working directory
  const stubFromCwd = join(process.cwd(), 'STUB_CLAUDE.md');
  if (existsSync(stubFromCwd)) {
    return stubFromCwd;
  }

  return null;
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
  const targetContent = await readFile(targetPath, 'utf-8');

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
  await writeFile(backupPath, targetContent, 'utf-8');

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
  await writeFile(targetPath, newContent, 'utf-8');

  return {
    success: true,
    filePath: targetPath,
    message: `Updated successfully (backup created: ${backupPath})`,
  };
}

async function handler(argv: ArgumentsCamelCase<UpdateArgv>): Promise<void> {
  // Find STUB_CLAUDE.md
  const stubPath = findStubFile();
  if (!stubPath) {
    console.error('Error: STUB_CLAUDE.md not found.');
    console.error('');
    console.error('Searched locations:');
    console.error('  - Project root (relative to source)');
    console.error('  - Current working directory');
    process.exit(1);
  }

  // Read stub content
  const stubContent = await readFile(stubPath, 'utf-8');

  console.log('Agent Tools Documentation Updater');
  console.log('==================================');
  console.log('');

  const results: UpdateResult[] = [];

  // If specific file provided, update only that file
  if (argv.targetFile) {
    const result = await updateClaudeFile(argv.targetFile, stubContent);
    results.push(result);
  } else {
    // Update project CLAUDE.md (in same directory as STUB_CLAUDE.md)
    const projectPath = join(dirname(stubPath), 'CLAUDE.md');
    if (existsSync(projectPath)) {
      console.log('Updating project CLAUDE.md...');
      const result = await updateClaudeFile(projectPath, stubContent);
      results.push(result);
      console.log('');
    }

    // Update global CLAUDE.md
    const home = homedir();
    const globalPath = join(home, '.claude', 'CLAUDE.md');
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
      console.log(`[OK] ${result.filePath}`);
      console.log(`     ${result.message}`);
    } else {
      console.log(`[ERROR] ${result.filePath}`);
      console.log(`        ${result.message}`);
      hasErrors = true;
    }
    console.log('');
  }

  if (results.length === 0) {
    console.log('No CLAUDE.md files found to update.');
    console.log('');
    console.log('Expected locations:');
    console.log(`  - ${join(dirname(stubPath), 'CLAUDE.md')}`);
    console.log(`  - ${join(homedir(), '.claude', 'CLAUDE.md')}`);
  }

  console.log('Done!');
  console.log('');
  console.log('To restore from backup:');
  console.log('  mv filename.backup filename');

  if (hasErrors) {
    process.exit(1);
  }
}

export const updateCommand: CommandModule<object, UpdateArgv> = {
  command: 'update [targetFile]',
  describe: 'Update CLAUDE.md with latest tool documentation',
  builder: {
    targetFile: {
      type: 'string',
      describe:
        'Target CLAUDE.md file to update (default: updates both project and global)',
    },
  },
  handler,
};
