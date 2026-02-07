/**
 * SleepCore Companion App - Settings
 * ===================================
 * Android Companion App for Health Connect integration.
 */

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "SleepCoreCompanion"
include(":app")
