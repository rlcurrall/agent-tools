/**
 * Ambient module declarations for Bun's file embedding feature.
 * When using `import x from './file.md' with { type: 'file' }`,
 * Bun returns the embedded file path as a string.
 */

// Markdown files - always imported as file paths in this project
declare module '*.md' {
  const path: string;
  export default path;
}
