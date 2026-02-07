/**
 * Navigation Host
 * =================
 * Main navigation graph for the app.
 */

package ru.sleepcore.companion.presentation.main

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import ru.sleepcore.companion.presentation.link.LinkScreen
import ru.sleepcore.companion.presentation.sync.SyncScreen

sealed class Screen(val route: String) {
    data object Link : Screen("link")
    data object Sync : Screen("sync")
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
            SyncScreen(
                onUnlinked = {
                    navController.navigate(Screen.Link.route) {
                        popUpTo(Screen.Sync.route) { inclusive = true }
                    }
                }
            )
        }
    }
}
