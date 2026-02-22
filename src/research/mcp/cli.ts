#!/usr/bin/env node
/**
 * @fileoverview MCP Server CLI
 * @module research/mcp/cli
 * @description CLI для запуска MCP сервера
 *
 * Usage:
 *   npx ts-node src/research/mcp/cli.ts [--stdio | --http [port]]
 *
 * Examples:
 *   npx ts-node src/research/mcp/cli.ts --stdio      # For Claude Desktop
 *   npx ts-node src/research/mcp/cli.ts --http       # HTTP on port 3002
 *   npx ts-node src/research/mcp/cli.ts --http 8080  # HTTP on port 8080
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import { runStdioServer } from './stdio-transport';
import { runHTTPServer } from './http-transport';

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
SleepCore Research Agent MCP Server

Usage:
  npx ts-node src/research/mcp/cli.ts [options]

Options:
  --stdio         Run as stdio server (for Claude Desktop)
  --http [port]   Run as HTTP server (default port: 3002)
  --help, -h      Show this help message

Examples:
  # For Claude Desktop (add to claude_desktop_config.json)
  npx ts-node src/research/mcp/cli.ts --stdio

  # For web integrations
  npx ts-node src/research/mcp/cli.ts --http 3002

Configuration for Claude Desktop (claude_desktop_config.json):
{
  "mcpServers": {
    "sleepcore-research": {
      "command": "npx",
      "args": ["ts-node", "/path/to/sleepcore/src/research/mcp/cli.ts", "--stdio"]
    }
  }
}
`);
    process.exit(0);
  }

  if (args.includes('--stdio')) {
    console.error('[MCP CLI] Starting stdio server...');
    runStdioServer();
    return;
  }

  if (args.includes('--http')) {
    const portIndex = args.indexOf('--http') + 1;
    const port = portIndex < args.length && !args[portIndex].startsWith('-')
      ? parseInt(args[portIndex], 10)
      : 3002;

    console.log('[MCP CLI] Starting HTTP server...');
    const transport = await runHTTPServer(port);
    console.log(`[MCP CLI] Server running at ${transport.getAddress()}`);
    console.log('[MCP CLI] Press Ctrl+C to stop');

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n[MCP CLI] Shutting down...');
      await transport.stop();
      process.exit(0);
    });

    return;
  }

  // Default: stdio
  console.error('[MCP CLI] No transport specified, defaulting to stdio');
  console.error('[MCP CLI] Use --http for HTTP transport or --help for options');
  runStdioServer();
}

main().catch((error) => {
  console.error('[MCP CLI] Error:', error);
  process.exit(1);
});
