import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import basicSsl from '@vitejs/plugin-basic-ssl'; // Uncomment for HTTPS dev
import { visualizer } from 'rollup-plugin-visualizer';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Uncomment for HTTPS local development (required for Telegram Mini App testing)
    // basicSsl(),
    // Sentry sourcemap upload (only in production build with auth token)
    process.env.SENTRY_AUTH_TOKEN &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG || 'sleepcore',
        project: process.env.SENTRY_PROJECT || 'mini-app',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          filesToDeleteAfterUpload: ['**/*.map'],
        },
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    // Security: 'hidden' generates sourcemaps but doesn't expose sourceMappingURL
    // This prevents source code leakage while still allowing debugging via manual upload
    // @see https://blog.sentry.security/abusing-exposed-sourcemaps/
    sourcemap: 'hidden',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React runtime - always needed
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/scheduler')) {
            return 'vendor';
          }
          // TanStack Query - loaded with first API call
          if (id.includes('@tanstack/react-query')) {
            return 'query';
          }
          // Motion/Framer - only needed on Breathing page
          if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
            return 'motion';
          }
          // Sentry - monitoring, can load async
          if (id.includes('@sentry')) {
            return 'sentry';
          }
          // i18n - translations, small but separate
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n';
          }
          // State management - small, core dependency
          if (id.includes('zustand')) {
            return 'state';
          }
        },
      },
      plugins: [
        // Bundle analyzer - generates stats.html for visual inspection
        // Run: npm run build && open dist/stats.html
        visualizer({
          filename: 'dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
        }),
      ],
    },
  },
});
