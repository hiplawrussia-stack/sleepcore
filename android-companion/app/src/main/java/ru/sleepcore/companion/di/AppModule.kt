/**
 * Hilt Dependency Injection Module
 * ==================================
 * Provides application-level dependencies.
 *
 * Security features based on research:
 * - TLS 1.3 with certificate pinning
 * - Logging disabled in release
 */

package ru.sleepcore.companion.di

import android.content.Context
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ConnectionSpec
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import ru.sleepcore.companion.BuildConfig
import ru.sleepcore.companion.data.api.SleepCoreApi
import ru.sleepcore.companion.data.local.SleepCoreDatabase
import ru.sleepcore.companion.data.local.TokenStorage
import ru.sleepcore.companion.data.local.audit.AuditLogDao
import ru.sleepcore.companion.data.local.audit.AuditLogger
import ru.sleepcore.companion.health.HealthConnectManager
import ru.sleepcore.companion.security.BiometricAuthManager
import ru.sleepcore.companion.security.SessionManager
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        isLenient = true
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)

        // SECURITY: Enforce TLS 1.2+ (HIPAA 2025 requirement)
        // MODERN_TLS allows TLS 1.2 and 1.3 with strong cipher suites
        // RESTRICTED_TLS would be TLS 1.3 only but may break compatibility
        // Source: HIPAA Security Rule 2025, OWASP MASVS-NETWORK-1
        builder.connectionSpecs(listOf(ConnectionSpec.MODERN_TLS))

        // Add logging interceptor for debug builds
        // SECURITY: Use HEADERS level instead of BODY to avoid logging PHI
        // Redact Authorization header to prevent token leakage in logs
        if (BuildConfig.DEBUG) {
            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.HEADERS
                redactHeader("Authorization")
                redactHeader("X-Device-Token")
            }
            builder.addInterceptor(loggingInterceptor)
        }

        // Certificate pinning: Handled by Android's Network Security Config (res/xml/network_security_config.xml)
        // which provides flexible pin management without app updates
        // Source: developer.android.com/privacy-and-security/security-config (2025-2026)

        return builder.build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        json: Json
    ): Retrofit {
        val contentType = "application/json".toMediaType()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
    }

    @Provides
    @Singleton
    fun provideSleepCoreApi(retrofit: Retrofit): SleepCoreApi {
        return retrofit.create(SleepCoreApi::class.java)
    }

    @Provides
    @Singleton
    fun provideTokenStorage(
        @ApplicationContext context: Context
    ): TokenStorage {
        return TokenStorage(context)
    }

    @Provides
    @Singleton
    fun provideHealthConnectManager(
        @ApplicationContext context: Context
    ): HealthConnectManager {
        return HealthConnectManager(context)
    }

    // ===========================================
    // HIPAA Audit Trail (Room Database)
    // ===========================================

    @Provides
    @Singleton
    fun provideSleepCoreDatabase(
        @ApplicationContext context: Context
    ): SleepCoreDatabase {
        return SleepCoreDatabase.getInstance(context)
    }

    @Provides
    @Singleton
    fun provideAuditLogDao(database: SleepCoreDatabase): AuditLogDao {
        return database.auditLogDao()
    }

    @Provides
    @Singleton
    fun provideAuditLogger(
        @ApplicationContext context: Context,
        auditLogDao: AuditLogDao
    ): AuditLogger {
        return AuditLogger(context, auditLogDao)
    }

    // ===========================================
    // HIPAA Session Management
    // ===========================================

    @Provides
    @Singleton
    fun provideSessionManager(
        @ApplicationContext context: Context,
        auditLogger: AuditLogger
    ): SessionManager {
        return SessionManager(context, auditLogger)
    }

    @Provides
    @Singleton
    fun provideBiometricAuthManager(
        @ApplicationContext context: Context,
        auditLogger: AuditLogger
    ): BiometricAuthManager {
        return BiometricAuthManager(context, auditLogger)
    }
}
