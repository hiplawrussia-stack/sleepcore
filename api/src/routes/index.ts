/**
 * Routes Index
 * ============
 * Re-export all route modules.
 */

export { default as authRoutes } from './auth.js';
export { default as breathingRoutes } from './breathing.js';
export { default as userRoutes } from './user.js';
export { default as syncRoutes } from './sync.js';
export { default as healthRoutes, setInitialized } from './health.js';
export { default as wearableRoutes } from './wearable.js';
export { default as leaderboardRoutes } from './leaderboard.js';
export { default as downloadRoutes } from './download.js';
export { ouraRoutes } from '../integrations/oura/index.js';
