/**
 * Oura Ring Integration Module
 * ============================
 * OAuth2-authenticated integration with Oura Ring API v2.
 *
 * Exports:
 * - routes: Hono router for API endpoints
 * - OuraClient: Low-level API client
 * - OuraSyncService: High-level sync orchestration
 * - Types and schema
 *
 * @packageDocumentation
 * @module api/integrations/oura
 */

export { default as ouraRoutes } from './routes.js';
export { OuraClient, type OuraClientConfig } from './OuraClient.js';
export { OuraSyncService } from './OuraSyncService.js';
export * from './types.js';
export * from './schema.js';
