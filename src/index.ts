#!/usr/bin/env bun

// Main entry point for the Jira CLI tools
// This can be used to route commands or provide a unified interface

console.log('Jira CLI Tools');
console.log('==============');
console.log('');
console.log('Available commands:');
console.log('  bun run jira-search "JQL_QUERY" [MAX_RESULTS]');
console.log('  bun run jira-get-ticket TICKET_KEY');
console.log('');
console.log('For help on specific commands:');
console.log('  bun run jira-search --help');
console.log('  bun run jira-get-ticket --help');
console.log('');
console.log('Configuration:');
console.log('  Copy .env.example to .env and configure your Jira credentials');
