/**
 * SleepCore Companion App - Root Build Configuration
 * ====================================================
 * Android Companion App for Health Connect integration.
 *
 * Based on research (February 2026):
 * - Health Connect Jetpack SDK 1.1.0 stable
 * - Android 14+ native Health Connect integration
 * - World Sleep Society 2025 recommendations compliance
 */

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.kapt) apply false
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.sentry) apply false
}
