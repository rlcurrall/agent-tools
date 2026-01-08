/**
 * ADF to Markdown Converter
 *
 * Converts Atlassian Document Format (ADF) to Markdown
 * Based on https://github.com/julianlam/adf-to-md
 * Vendored and modernized for TypeScript
 */

import type { AdfNode, AdfInput } from './types.js';

export interface ConversionResult {
  result: string;
  warnings: Record<string, string[]>;
}

function convertNode(
  node: AdfNode,
  warnings: Record<string, string[]>
): string {
  const content = node.content || [];

  switch (node.type) {
    case 'doc':
      return content.map((child) => convertNode(child, warnings)).join('\n\n');

    case 'text':
      return convertMarks(node, warnings);

    case 'paragraph':
      return content.map((child) => convertNode(child, warnings)).join('');

    case 'heading':
      const level = Number(node.attrs?.level) || 1;
      const headingText = content
        .map((child) => convertNode(child, warnings))
        .join('');
      return `${'#'.repeat(level)} ${headingText}`;

    case 'hardBreak':
      return '\n';

    case 'inlineCard':
    case 'blockCard':
    case 'embedCard':
      const url = node.attrs?.url || '#';
      return `[${url}](${url})`;

    case 'blockquote':
      const blockContent = content
        .map((child) => convertNode(child, warnings))
        .join('\n> ');
      return `> ${blockContent}`;

    case 'codeBlock':
      const language = node.attrs?.language || '';
      const codeContent = content
        .map((child) => convertNode(child, warnings))
        .join('');
      return `\`\`\`${language}\n${codeContent}\n\`\`\``;

    case 'orderedList':
      return content
        .map((child, index) => {
          const itemContent = convertNode(child, warnings);
          return `${index + 1}. ${itemContent}`;
        })
        .join('\n');

    case 'bulletList':
      return content
        .map((child) => {
          const itemContent = convertNode(child, warnings);
          return `- ${itemContent}`;
        })
        .join('\n');

    case 'listItem':
      return content.map((child) => convertNode(child, warnings)).join('\n');

    case 'table':
      const rows = content.map((child) => convertNode(child, warnings));
      if (rows.length === 0) return '';

      // Get the first row to determine column count
      const firstRow = rows[0];
      if (!firstRow) return '';

      // Count columns from pipe characters (subtract 1 because of leading/trailing pipes)
      const columnCount = (firstRow.match(/\|/g) || []).length - 1;

      // Create separator row with proper alignment markers
      const separatorCells = Array(columnCount).fill('---');
      const separator = `|${separatorCells.join('|')}|`;

      let tableMarkdown: string;

      // If there's only one row, create an empty header so the content shows as data
      if (rows.length === 1) {
        const emptyHeader = `|${Array(columnCount).fill(' ').join('|')}|`;
        tableMarkdown = [emptyHeader, separator, firstRow].join('\n');
      } else {
        // Treat first row as header, rest as data
        tableMarkdown = [firstRow, separator, ...rows.slice(1)].join('\n');
      }

      // Add blank lines before and after table for proper markdown parsing
      return `\n${tableMarkdown}\n`;

    case 'tableRow':
      const cells = content.map((child) => convertNode(child, warnings));
      return `|${cells.join('|')}|`;

    case 'tableCell':
    case 'tableHeader':
      return content.map((child) => convertNode(child, warnings)).join('');

    case 'rule':
      return '---';

    case 'taskList':
      addWarning(
        warnings,
        'taskList',
        'Task lists may not render exactly as in Jira'
      );
      return content.map((child) => convertNode(child, warnings)).join('\n');

    case 'taskItem':
      const isChecked = node.attrs?.state === 'DONE';
      const taskContent = content
        .map((child) => convertNode(child, warnings))
        .join('');
      return `- [${isChecked ? 'x' : ' '}] ${taskContent}`;

    case 'mediaGroup':
    case 'mediaSingle':
    case 'media':
      // Media nodes are complex - just return a placeholder
      addWarning(
        warnings,
        'media',
        'Media attachments converted to placeholder'
      );
      return '[Media attachment]';

    default:
      addWarning(warnings, node.type, `Unsupported node type: ${node.type}`);
      return content.map((child) => convertNode(child, warnings)).join('');
  }
}

function convertMarks(
  node: AdfNode,
  warnings: Record<string, string[]>
): string {
  let text = node.text || '';

  if (!node.marks || node.marks.length === 0) {
    return text;
  }

  for (const mark of node.marks) {
    switch (mark.type) {
      case 'strong':
        text = `**${text}**`;
        break;

      case 'em':
        text = `*${text}*`;
        break;

      case 'code':
        text = `\`${text}\``;
        break;

      case 'strike':
        text = `~~${text}~~`;
        break;

      case 'link':
        const href = mark.attrs?.href || '#';
        text = `[${text}](${href})`;
        break;

      case 'underline':
        // Markdown doesn't have native underline, use emphasis instead
        text = `*${text}*`;
        addWarning(warnings, 'underline', 'Underline converted to emphasis');
        break;

      case 'textColor':
        // Markdown doesn't support text colors - preserve text only
        addWarning(warnings, 'textColor', 'Text color formatting removed');
        break;

      default:
        addWarning(warnings, mark.type, `Unsupported mark type: ${mark.type}`);
        break;
    }
  }

  return text;
}

function addWarning(
  warnings: Record<string, string[]>,
  type: string,
  message: string
): void {
  if (!warnings[type]) {
    warnings[type] = [];
  }
  if (!warnings[type].includes(message)) {
    warnings[type].push(message);
  }
}

/**
 * Pre-process ADF to fix common Jira quirks:
 * - Language paragraphs before codeBlocks (e.g., <p>bash</p> followed by <codeBlock>)
 */
function preprocessAdf(node: AdfNode): AdfNode {
  if (!node.content || node.content.length === 0) {
    return node;
  }

  const newContent: AdfNode[] = [];
  const commonLanguages = [
    'bash',
    'json',
    'javascript',
    'typescript',
    'python',
    'java',
    'csharp',
    'c#',
    'sql',
    'xml',
    'html',
    'css',
    'yaml',
    'yml',
    'shell',
    'powershell',
    'go',
    'rust',
    'ruby',
    'php',
  ];

  for (let i = 0; i < node.content.length; i++) {
    const current = node.content.at(i);
    const next = node.content.at(i + 1);

    if (!current) continue;

    // Check if current is a paragraph with only a language name and next is a codeBlock
    if (
      current.type === 'paragraph' &&
      current.content?.length === 1 &&
      current.content[0]!.type === 'text' &&
      next?.type === 'codeBlock'
    ) {
      const text = current.content[0]!.text?.toLowerCase().trim() || '';

      if (commonLanguages.includes(text)) {
        // Skip this paragraph and add language to next codeBlock
        const enhancedCodeBlock = {
          ...next,
          attrs: {
            ...next.attrs,
            language: text === 'c#' ? 'csharp' : text,
          },
        };
        newContent.push(preprocessAdf(enhancedCodeBlock));
        i++; // Skip next iteration since we processed it
        continue;
      }
    }

    // Recursively process child nodes
    newContent.push(preprocessAdf(current));
  }

  return {
    ...node,
    content: newContent,
  };
}

function validateInput(adf: AdfInput): asserts adf is AdfNode {
  if (!adf || typeof adf !== 'object') {
    throw new Error('Input must be a valid ADF object');
  }

  if (adf.type !== 'doc') {
    throw new Error('ADF must have a root "doc" node');
  }
}

export function convert(adf: AdfInput): ConversionResult {
  const warnings: Record<string, string[]> = {};

  try {
    validateInput(adf);
    const preprocessed = preprocessAdf(adf);
    const result = convertNode(preprocessed, warnings);

    return {
      result: result.trim(),
      warnings,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown conversion error';
    return {
      result: '',
      warnings: {
        error: [message],
      },
    };
  }
}

export default { convert };
