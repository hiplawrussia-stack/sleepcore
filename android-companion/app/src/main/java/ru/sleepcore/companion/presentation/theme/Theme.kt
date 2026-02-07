/**
 * SleepCore Companion Theme
 * ==========================
 * Material 3 dynamic color theme for the app.
 */

package ru.sleepcore.companion.presentation.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

// Sleep-themed colors
private val SleepPurple = Color(0xFF6B5CE7)
private val SleepPurpleLight = Color(0xFF9B8FFF)
private val SleepPurpleDark = Color(0xFF4A3FB3)
private val SleepBlue = Color(0xFF1E88E5)
private val SleepIndigo = Color(0xFF3F51B5)

private val LightColorScheme = lightColorScheme(
    primary = SleepPurple,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE8E0FF),
    onPrimaryContainer = Color(0xFF1D0160),
    secondary = SleepBlue,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFD3E4FF),
    onSecondaryContainer = Color(0xFF001C38),
    tertiary = SleepIndigo,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFDFE0FF),
    onTertiaryContainer = Color(0xFF00105C),
    error = Color(0xFFBA1A1A),
    onError = Color.White,
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410002),
    background = Color(0xFFFFFBFF),
    onBackground = Color(0xFF1C1B1F),
    surface = Color(0xFFFFFBFF),
    onSurface = Color(0xFF1C1B1F),
    surfaceVariant = Color(0xFFE7E0EB),
    onSurfaceVariant = Color(0xFF49454E)
)

private val DarkColorScheme = darkColorScheme(
    primary = SleepPurpleLight,
    onPrimary = Color(0xFF320099),
    primaryContainer = SleepPurple,
    onPrimaryContainer = Color(0xFFE8E0FF),
    secondary = Color(0xFFA3C9FF),
    onSecondary = Color(0xFF00325A),
    secondaryContainer = Color(0xFF004880),
    onSecondaryContainer = Color(0xFFD3E4FF),
    tertiary = Color(0xFFBEC2FF),
    onTertiary = Color(0xFF0B2091),
    tertiaryContainer = Color(0xFF2A3BA8),
    onTertiaryContainer = Color(0xFFDFE0FF),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    background = Color(0xFF1C1B1F),
    onBackground = Color(0xFFE6E1E6),
    surface = Color(0xFF1C1B1F),
    onSurface = Color(0xFFE6E1E6),
    surfaceVariant = Color(0xFF49454E),
    onSurfaceVariant = Color(0xFFCAC4CF)
)

@Composable
fun SleepCoreCompanionTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}
