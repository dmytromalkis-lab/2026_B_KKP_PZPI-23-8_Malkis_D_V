package com.example.fleetmanagement.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.fleetmanagement.database.AppDatabase
import com.example.fleetmanagement.screens.DriversScreen
import com.example.fleetmanagement.screens.LoginScreen
import com.example.fleetmanagement.screens.RoutesScreen
import com.example.fleetmanagement.screens.VehiclesScreen

@Composable
fun AppNavigation(database: AppDatabase) {

    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "login"
    ) {

        composable("login") {
            LoginScreen(
                onLogin = {
                    navController.navigate("vehicles") {
                        popUpTo("login") {
                            inclusive = true
                        }
                    }
                }
            )
        }

        composable("vehicles") {
            VehiclesScreen(
                database = database,
                navController = navController
            )
        }

        composable("drivers") {
            DriversScreen(
                database = database,
                navController = navController
            )
        }

        composable("routes") {
            RoutesScreen(
                database = database,
                navController = navController
            )
        }
    }
}