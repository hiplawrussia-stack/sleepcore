/**
 * Storage Module
 * ==============
 * Session storage implementations for VK Bot.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-bot/storage
 */

export { RedisStorage, createRedisStorage } from './RedisStorage';
export type { ISessionStorage, RedisStorageOptions } from './RedisStorage';
