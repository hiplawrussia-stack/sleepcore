# ProGuard Rules for SleepCore Companion
# ========================================

# Keep kotlinx.serialization classes
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Keep Serializable data classes
-keep,includedescriptorclasses class ru.sleepcore.companion.**$$serializer { *; }
-keepclassmembers class ru.sleepcore.companion.** {
    *** Companion;
}
-keepclasseswithmembers class ru.sleepcore.companion.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Keep API models
-keep class ru.sleepcore.companion.data.api.** { *; }
-keep class ru.sleepcore.companion.domain.model.** { *; }

# Retrofit
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface <1>

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Health Connect SDK
-keep class androidx.health.connect.client.** { *; }

# Hilt
-keepclasseswithmembers class * {
    @dagger.hilt.* <methods>;
}
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }

# WorkManager
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context,androidx.work.WorkerParameters);
}

# Keep Compose
-keep class androidx.compose.** { *; }

# Security Crypto - EncryptedSharedPreferences
-keep class androidx.security.crypto.** { *; }

# Google Tink - Encryption Library (Feb 2026)
# Based on research: R8 stripping issue with Tink + Protobuf
# Source: docs.sentry.io/platforms/android/troubleshooting/
# Confidence: HIGH
-keep class com.google.crypto.tink.** { *; }
-keepclassmembers class com.google.crypto.tink.** { *; }
-dontwarn com.google.crypto.tink.**

# Tink uses shaded Protobuf (since 1.10.0) - keep these classes
-keep class com.google.crypto.tink.shaded.protobuf.** { *; }
-keepclassmembers class com.google.crypto.tink.shaded.protobuf.** { *; }

# Tink KeysetHandle and related classes
-keep class * extends com.google.crypto.tink.KeyManager { *; }
-keep class * extends com.google.crypto.tink.KeyTypeManager { *; }
-keep class * implements com.google.crypto.tink.PrimitiveWrapper { *; }

# Tink Aead, Mac, and other primitives
-keep class * implements com.google.crypto.tink.Aead { *; }
-keep class * implements com.google.crypto.tink.Mac { *; }
-keep class * implements com.google.crypto.tink.StreamingAead { *; }
-keep class * implements com.google.crypto.tink.DeterministicAead { *; }

# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
}
