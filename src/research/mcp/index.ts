/**
 * @fileoverview MCP Module Index
 * @module research/mcp
 * @description Model Context Protocol server для Research Agent
 *
 * @see https://modelcontextprotocol.io/
 *
 * @safety NON-CRITICAL
 * @compliance Research tool, not clinical
 */

export { ResearchMCPServer } from './server';
export type { MCPRequest, MCPResponse, MCPToolDefinition, MCPResourceDefinition } from './server';

export { MCPStdioTransport, runStdioServer } from './stdio-transport';
export { MCPHTTPTransport, runHTTPServer } from './http-transport';
