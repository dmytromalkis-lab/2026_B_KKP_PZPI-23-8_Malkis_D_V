package com.example.fleetmanagement.screens

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import api.RetrofitClient
import com.example.fleetmanagement.database.AppDatabase
import com.example.fleetmanagement.models.Route
import kotlinx.coroutines.launch

@Composable
fun RoutesScreen(
    database: AppDatabase,
    navController: NavController
) {
    val context = LocalContext.current

    var routes by remember { mutableStateOf(listOf<Route>()) }

    var vehicleId by remember { mutableStateOf("") }

    var plannedStart by remember { mutableStateOf("") }

    var plannedEnd by remember { mutableStateOf("") }

    var startPoint by remember { mutableStateOf("") }

    var endPoint by remember { mutableStateOf("") }

    var status by remember { mutableStateOf("") }

    var editingRoute by remember { mutableStateOf<Route?>(null) }

    val scope = rememberCoroutineScope()

    suspend fun refresh() {
        try {
            val response =
                RetrofitClient.api.getRoutes()

            if (response.isSuccessful) {
                routes =
                    response.body() ?: emptyList()
            } else {
                Toast.makeText(context, "Error: ${response.message()}", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(context, "Connection failed: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    LaunchedEffect(Unit) {
        refresh()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {

        Text(
            text = "Routes",
            style = MaterialTheme.typography.headlineMedium
        )
        Spacer(modifier = Modifier.height(8.dp))

        Button(onClick = {
            navController.navigate("login") {
                popUpTo(0)
            }
        }) {
            Text("Logout")
        }
        Spacer(modifier = Modifier.height(16.dp))

        Row {

            Button(onClick = {
                navController.navigate("vehicles")
            }) {
                Text("Vehicles")
            }

            Spacer(modifier = Modifier.width(12.dp))

            Button(onClick = {
                navController.navigate("drivers")
            }) {
                Text("Drivers")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = vehicleId,
            onValueChange = { vehicleId = it },
            label = { Text("Vehicle ID") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = plannedStart,
            onValueChange = { plannedStart = it },
            label = { Text("Planned Start") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = plannedEnd,
            onValueChange = { plannedEnd = it },
            label = { Text("Planned End") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = startPoint,
            onValueChange = { startPoint = it },
            label = { Text("Start Point") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = endPoint,
            onValueChange = { endPoint = it },
            label = { Text("End Point") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = status,
            onValueChange = { status = it },
            label = { Text("Status") }
        )

        Spacer(modifier = Modifier.height(16.dp))

        Button(onClick = {

            scope.launch {
                try {
                    if (editingRoute == null) {
                        RetrofitClient.api.createRoute(
                            vehicleId = vehicleId,
                            plannedStart = plannedStart,
                            plannedEnd = plannedEnd,
                            startPoint = startPoint,
                            endPoint = endPoint,
                            status = status
                        )
                    } else {
                        RetrofitClient.api.updateRoute(
                            id = editingRoute!!.route_id,
                            vehicleId = vehicleId,
                            plannedStart = plannedStart,
                            plannedEnd = plannedEnd,
                            startPoint = startPoint,
                            endPoint = endPoint,
                            status = status
                        )
                        editingRoute = null
                    }

                    vehicleId = ""
                    plannedStart = ""
                    plannedEnd = ""
                    startPoint = ""
                    endPoint = ""
                    status = ""

                    refresh()
                } catch (e: Exception) {
                    Toast.makeText(context, "Action failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }

        }) {

            Text(
                if (editingRoute == null)
                    "Add Route"
                else
                    "Update Route"
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn {

            items(routes) { route ->

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                ) {

                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {

                        Text("Vehicle ID: ${route.vehicle_id}")

                        Text(
                            "Planned Start: ${route.planned_start}"
                        )

                        Text(
                            "Planned End: ${route.planned_end}"
                        )

                        Text(route.start_point)

                        Text(route.end_point)

                        Text(route.status)

                        Spacer(modifier = Modifier.height(12.dp))

                        Row {

                            Button(onClick = {

                                editingRoute = route

                                vehicleId =
                                    route.vehicle_id?.toString()
                                        ?: ""

                                plannedStart =
                                    route.planned_start

                                plannedEnd =
                                    route.planned_end

                                startPoint =
                                    route.start_point

                                endPoint =
                                    route.end_point

                                status =
                                    route.status

                            }) {
                                Text("Edit")
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Button(onClick = {

                                scope.launch {
                                    try {
                                        RetrofitClient.api.deleteRoute(
                                            route.route_id
                                        )
                                        refresh()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Delete failed: ${e.message}", Toast.LENGTH_LONG).show()
                                    }
                                }

                            }) {
                                Text("Delete")
                            }
                        }
                    }
                }
            }
        }
    }
}