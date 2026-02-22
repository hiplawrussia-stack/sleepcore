/**
 * @fileoverview MCP HTTP Transport
 * @module research/mcp/http-transport
 * @description HTTP транспорт для MCP сервера (для веб-интеграций)
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

import * as http from 'http';
import { ResearchMCPServer, MCPRequest, MCPResponse } from './server';

/**
 * MCP HTTP Transport Configuration
 */
interface HTTPTransportConfig {
  port: number;
  host: string;
  cors: boolean;
}

const DEFAULT_CONFIG: HTTPTransportConfig = {
  port: 3002,
  host: 'localhost',
  cors: true,
};

/**
 * MCP HTTP Transport
 *
 * Handles communication with MCP clients via HTTP
 * using JSON-RPC 2.0 protocol.
 */
export class MCPHTTPTransport {
  private server: ResearchMCPServer;
  private httpServer: http.Server | null = null;
  private config: HTTPTransportConfig;

  constructor(server: ResearchMCPServer, config: Partial<HTTPTransportConfig> = {}) {
    this.server = server;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start HTTP server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer(async (req, res) => {
        // CORS headers
        if (this.config.cors) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        }

        // Handle preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // Only accept POST
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // Parse body
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const request = JSON.parse(body) as MCPRequest;
            const response = await this.server.handleRequest(request);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
          } catch (error) {
            const errorResponse: MCPResponse = {
              jsonrpc: '2.0',
              id: 0,
              error: {
                code: -32700,
                message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
              },
            };

            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(errorResponse));
          }
        });
      });

      this.httpServer.on('error', reject);

      this.httpServer.listen(this.config.port, this.config.host, () => {
        console.log(`[MCP HTTP] Server listening on http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop HTTP server
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.httpServer) {
        this.httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
        this.httpServer = null;
      } else {
        resolve();
      }
    });
  }

  /**
   * Get server address
   */
  getAddress(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }
}

/**
 * Main entry point for HTTP server
 */
export async function runHTTPServer(port: number = 3002): Promise<MCPHTTPTransport> {
  const server = new ResearchMCPServer();
  const transport = new MCPHTTPTransport(server, { port });
  await transport.start();
  return transport;
}
