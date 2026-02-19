/**
 * Download Routes
 * ===============
 * Serves static files like APK for Android companion app.
 */

import { Hono } from 'hono';
import { createReadStream, statSync, existsSync } from 'fs';
import { Readable } from 'stream';

const download = new Hono();

const APK_PATH = '/app/assets/SleepCore-Companion.apk';
const APK_FILENAME = 'SleepCore-Companion.apk';

/**
 * GET /android
 * Download Android companion app APK
 */
download.get('/android', async (c) => {
  // Check if file exists
  if (!existsSync(APK_PATH)) {
    console.error('[Download] APK not found:', APK_PATH);
    return c.json({
      success: false,
      error: 'APK file not found',
      timestamp: Date.now(),
    }, 404);
  }

  try {
    const stats = statSync(APK_PATH);
    const fileSize = stats.size;

    console.log(`[Download] Serving APK: ${APK_FILENAME} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

    // Set headers for file download
    c.header('Content-Type', 'application/vnd.android.package-archive');
    c.header('Content-Disposition', `attachment; filename="${APK_FILENAME}"`);
    c.header('Content-Length', fileSize.toString());
    c.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Stream the file
    const stream = createReadStream(APK_PATH);

    // Convert Node.js stream to Web ReadableStream
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new Response(webStream, {
      headers: c.res.headers,
    });
  } catch (error) {
    console.error('[Download] Error serving APK:', error);
    return c.json({
      success: false,
      error: 'Failed to serve APK file',
      timestamp: Date.now(),
    }, 500);
  }
});

export default download;
