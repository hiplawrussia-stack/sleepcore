/**
 * Navigation Host
 * =================
 * Main navigation graph for the app.
 *
 * Updated (February 2026):
 * - Added Diagnostics screen for Health Connect troubleshooting
 * - Added Setup Guides for manufacturer-specific instructions
 * - Added Manual Entry for Consensus Sleep Diary fallback
 */

package ru.sleepcore.companion.presentation.main

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import ru.sleepcore.companion.health.HealthConnectManager
import ru.sleepcore.companion.presentation.diagnostics.DiagnosticsScreen
import ru.sleepcore.companion.presentation.guides.SetupGuidesScreen
import ru.sleepcore.companion.presentation.link.LinkScreen
import ru.sleepcore.companion.presentation.manualentry.ManualEntryScreen
import ru.sleepcore.companion.presentation.sync.SyncScreen
import ru.sleepcore.companion.presentation.sync.SyncViewModel

sealed class Screen(val route: String) {
    data object Link : Screen("link")
    data object Sync : Screen("sync")
    data object Diagnostics : Screen("diagnostics")
    data object SetupGuides : Screen("setup_guides")
    data object ManualEntry : Screen("manual_entry")
}

@Composable
fun MainNavHost() {
    val navController = rememberNavController()
    val viewModel: MainViewModel = hiltViewModel()
    val isLinked by viewModel.isLinked.collectAsState()

    val startDestination = if (isLinked) Screen.Sync.route else Screen.Link.route

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Link.route) {
            LinkScreen(
                onLinked = {
                    navController.navigate(Screen.Sync.route) {
                        popUpTo(Screen.Link.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Sync.route) {
            // Get SyncViewModel for permission handling
            val syncViewModel: SyncViewModel = hiltViewModel()

            // Permission launcher for diagnostics screen
            val permissionLauncher = rememberLauncherForActivityResult(
                contract = syncViewModel.getPermissionContract()
            ) { granted ->
                syncViewModel.onPermissionsResult(granted)
            }

            SyncScreen(
                onUnlinked = {
                    navController.navigate(Screen.Link.route) {
                        popUpTo(Screen.Sync.route) { inclusive = true }
                    }
                },
                onNavigateToDiagnostics = {
                    navController.navigate(Screen.Diagnostics.route)
                },
                onNavigateToSetupGuides = {
                    navController.navigate(Screen.SetupGuides.route)
                },
                onNavigateToManualEntry = {
                    navController.navigate(Screen.ManualEntry.route)
                }
            )
        }

        composable(Screen.Diagnostics.route) {
            // Get SyncViewModel for permission handling
            val syncViewModel: SyncViewModel = hiltViewModel()

            // Permission launcher for diagnostics screen
            val permissionLauncher = rememberLauncherForActivityResult(
                contract = syncViewModel.getPermissionContract()
            ) { granted ->
                syncViewModel.onPermissionsResult(granted)
            }

            DiagnosticsScreen(
                onBack = {
                    navController.popBackStack()
                },
                onRequestPermissions = {
                    permissionLauncher.launch(HealthConnectManager.EXTENDED_PERMISSIONS)
                },
                onRelink = {
                    // Navigate to link screen for re-linking
                    navController.navigate(Screen.Link.route) {
                        popUpTo(Screen.Sync.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.SetupGuides.route) {
            SetupGuidesScreen(
                onBack = {
                    navController.popBackStack()
                },
                onNavigateToManualEntry = {
                    navController.navigate(Screen.ManualEntry.route)
                }
            )
        }

        composable(Screen.ManualEntry.route) {
            ManualEntryScreen(
                onBack = {
                    navController.popBackStack()
                },
                onSaved = {
                    // Return to sync screen after saving
                    navController.popBackStack(Screen.Sync.route, inclusive = false)
                }
            )
        }
    }
}
