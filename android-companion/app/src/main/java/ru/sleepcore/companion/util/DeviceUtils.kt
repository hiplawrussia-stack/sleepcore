/**
 * Device Utilities
 * =================
 * Helper functions for device identification.
 */

package ru.sleepcore.companion.util

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.provider.Settings
import ru.sleepcore.companion.BuildConfig
import ru.sleepcore.companion.domain.model.DeviceInfo
import java.util.UUID

object DeviceUtils {

    /**
     * Generate unique device ID
     * Uses Android ID combined with device info for uniqueness
     */
    @SuppressLint("HardwareIds")
    fun getDeviceId(context: Context): String {
        val androidId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        )
        return androidId ?: UUID.randomUUID().toString()
    }

    /**
     * Get device name (user-visible)
     */
    fun getDeviceName(): String {
        val manufacturer = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
        val model = Build.MODEL
        return if (model.startsWith(manufacturer, ignoreCase = true)) {
            model
        } else {
            "$manufacturer $model"
        }
    }

    /**
     * Get manufacturer
     */
    fun getManufacturer(): String = Build.MANUFACTURER

    /**
     * Get model
     */
    fun getModel(): String = Build.MODEL

    /**
     * Get Android version string
     */
    fun getOsVersion(): String = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"

    /**
     * Get app version
     */
    fun getAppVersion(): String = BuildConfig.VERSION_NAME

    /**
     * Build complete DeviceInfo
     */
    fun getDeviceInfo(context: Context): DeviceInfo = DeviceInfo(
        id = getDeviceId(context),
        name = getDeviceName(),
        manufacturer = getManufacturer(),
        model = getModel(),
        osVersion = getOsVersion(),
        appVersion = getAppVersion()
    )
}
