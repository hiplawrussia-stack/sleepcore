/**
 * SleepCore Companion App - Module Build Configuration
 * ======================================================
 * Android Companion App for Health Connect integration.
 *
 * Security compliance (Feb 2026):
 * - HIPAA/GDPR: AES-256-GCM encryption via Google Tink
 * - Token storage: DataStore + Tink (migrated from EncryptedSharedPreferences)
 * - TLS validation via Network Security Config
 */

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.sentry)
    jacoco
}

android {
    namespace = "ru.sleepcore.companion"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        applicationId = "ru.sleepcore.companion"
        minSdk = libs.versions.minSdk.get().toInt()
        targetSdk = libs.versions.targetSdk.get().toInt()
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        // Build config for API URL
        buildConfigField("String", "API_BASE_URL", "\"https://api.sleepcore.ru/api/\"")

        // Sentry DSN - Override via local.properties or CI environment
        // IMPORTANT: Set SENTRY_DSN in local.properties for development
        manifestPlaceholders["SENTRY_DSN"] = project.findProperty("SENTRY_DSN")?.toString()
            ?: System.getenv("SENTRY_DSN")
            ?: ""  // Empty DSN disables Sentry
    }

    buildTypes {
        debug {
            // Use production API for testing on real devices
            // Use http://10.0.2.2:3001/api/ for emulator only
            buildConfigField("String", "API_BASE_URL", "\"https://api.sleepcore.ru/api/\"")
            isDebuggable = true
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf(
            "-Xjspecify-annotations=strict"  // Health Connect SDK recommendation
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // AndroidX Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime)
    implementation(libs.androidx.lifecycle.viewmodel)
    implementation(libs.androidx.lifecycle.process) // Session timeout observer
    implementation(libs.androidx.activity.compose)

    // Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons)

    // Navigation
    implementation(libs.androidx.navigation.compose)

    // WorkManager - Background sync (15 min minimum)
    implementation(libs.androidx.work.runtime)

    // DataStore & Security - Secure token storage
    // Migrated from EncryptedSharedPreferences to DataStore + Tink (Feb 2026)
    // Tink provides more robust key management without Samsung KeyStoreException issues
    implementation(libs.androidx.datastore)
    implementation(libs.androidx.security.crypto)  // Keep for migration from old storage
    implementation(libs.tink.android)

    // Biometric - HIPAA-compliant authentication
    implementation(libs.androidx.biometric)

    // Health Connect - Sleep, HRV, Heart Rate data
    implementation(libs.androidx.health.connect)

    // Networking
    implementation(libs.retrofit.core)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp.core)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)

    // Hilt DI
    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)
    implementation(libs.hilt.work)
    kapt(libs.hilt.work.compiler)

    // Coroutines
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.coroutines.android)

    // Room - HIPAA Audit Trail (persistent immutable logs)
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    kapt(libs.androidx.room.compiler)

    // Sentry - Crash reporting & performance monitoring (HIPAA BAA available)
    // Research (Feb 2026): Sentry 8.x with Jetpack Compose support
    // Requires HIPAA BAA on Sentry Business tier
    implementation(libs.sentry.android)
    implementation(libs.sentry.compose)

    // Testing
    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.turbine)
    testImplementation(libs.arch.core.testing)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.work.testing)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}

kapt {
    correctErrorTypes = true
    // Room schema export location for migrations
    arguments {
        arg("room.schemaLocation", "$projectDir/schemas")
    }
}

// Sentry Gradle Plugin Configuration
// Source: docs.sentry.io/platforms/android/configuration/gradle/
sentry {
    // Enables source context for stack traces
    includeSourceContext.set(true)

    // Uploads ProGuard/R8 mappings for readable stack traces
    autoUploadProguardMapping.set(true)

    // Auto-instrumentation for performance monitoring
    tracingInstrumentation {
        enabled.set(true)
    }

    // HIPAA: Don't include local source files in builds
    includeNativeSources.set(false)

    // DSN from properties (CI/CD) - fallback to manifest
    autoInstallation {
        enabled.set(false) // We manually initialize for HIPAA compliance
    }
}

// =============================================================================
// JaCoCo Code Coverage Configuration
// =============================================================================
// Best practices 2025-2026:
// - Minimum 80% line coverage for production code
// - Exclude generated code (Hilt, Room, BuildConfig)
// - HTML + XML reports for CI integration
// =============================================================================

jacoco {
    toolVersion = "0.8.12"
}

// Coverage report task
tasks.register<JacocoReport>("jacocoTestReport") {
    dependsOn("testDebugUnitTest")

    reports {
        xml.required.set(true)  // For Codecov/SonarQube
        html.required.set(true) // For human review
        csv.required.set(false)
    }

    val fileFilter = listOf(
        // Android generated
        "**/R.class",
        "**/R\$*.class",
        "**/BuildConfig.*",
        "**/Manifest*.*",
        // Hilt generated
        "**/*_HiltModules*",
        "**/*_Factory*",
        "**/*_MembersInjector*",
        "**/Hilt_*",
        "**/dagger/**",
        // Room generated
        "**/*_Impl*",
        "**/*Dao_Impl*",
        // Data classes (Kotlin)
        "**/*\$Creator*",
        // Compose generated
        "**/ComposableSingletons*"
    )

    val debugTree = fileTree("${buildDir}/tmp/kotlin-classes/debug") {
        exclude(fileFilter)
    }

    val mainSrc = "${project.projectDir}/src/main/java"

    sourceDirectories.setFrom(files(mainSrc))
    classDirectories.setFrom(files(debugTree))
    executionData.setFrom(fileTree(buildDir) {
        include("jacoco/testDebugUnitTest.exec")
    })
}

// Coverage verification (quality gate)
tasks.register<JacocoCoverageVerification>("jacocoTestCoverageVerification") {
    dependsOn("jacocoTestReport")

    violationRules {
        rule {
            limit {
                // Minimum 80% line coverage
                minimum = "0.80".toBigDecimal()
            }
        }

        // Stricter rules for security-critical packages
        rule {
            element = "PACKAGE"
            includes = listOf(
                "ru.sleepcore.companion.security.*",
                "ru.sleepcore.companion.data.local.audit.*"
            )
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                minimum = "0.90".toBigDecimal()  // 90% for security code
            }
        }
    }

    val fileFilter = listOf(
        "**/R.class",
        "**/R\$*.class",
        "**/BuildConfig.*",
        "**/*_HiltModules*",
        "**/*_Factory*",
        "**/*_Impl*"
    )

    val debugTree = fileTree("${buildDir}/tmp/kotlin-classes/debug") {
        exclude(fileFilter)
    }

    classDirectories.setFrom(files(debugTree))
    executionData.setFrom(fileTree(buildDir) {
        include("jacoco/testDebugUnitTest.exec")
    })
}

// Run coverage check on every test run
afterEvaluate {
    tasks.named("testDebugUnitTest") {
        finalizedBy("jacocoTestReport")
    }
}
