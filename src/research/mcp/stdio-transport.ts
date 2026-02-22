/**
 * @fileoverview MCP Stdio Transport
 * @module research/mcp/stdio-transport
 * @description Stdio транспорт для MCP сервера (для Claude Desktop)
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import * as readline from 'readline';
import { ResearchMCPServer, MCPRequest, MCPResponse } from './server';

/**
 * MCP Stdio Transport
 *
 * Handles communication with MCP clients via stdin/stdout
 * using JSON-RPC 2.0 protocol.
 */
export class MCPStdioTransport {
  private server: ResearchMCPServer;
  private rl: readline.Interface | null = null;

  constructor(server: ResearchMCPServer) {
    this.server = server;
  }

  /**
   * Start listening for requests on stdin
   */
  start(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    // Handle incoming lines
    this.rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line) as MCPRequest;
        const response = await this.server.handleRequest(request);
        this.sendResponse(response);
      } catch (error) {
        const errorResponse: MCPResponse = {
          jsonrpc: '2.0',
          id: 0,
          error: {
            code: -32700,
            message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
          },
        };
        this.sendResponse(errorResponse);
      }
    });

    this.rl.on('close', () => {
      process.exit(0);
    });

    // Handle errors
    process.stdin.on('error', (err) => {
      console.error('[MCP] Stdin error:', err.message);
      process.exit(1);
    });

    console.error('[MCP] SleepCore Research Agent MCP Server started');
    console.error('[MCP] Listening on stdin...');
  }

  /**
   * Send response to stdout
   */
  private sendResponse(response: MCPResponse): void {
    const json = JSON.stringify(response);
    process.stdout.write(json + '\n');
  }

  /**
   * Stop the transport
   */
  stop(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

/**
 * Main entry point for stdio server
 */
export function runStdioServer(): void {
  const server = new ResearchMCPServer();
  const transport = new MCPStdioTransport(server);
  transport.start();
}
