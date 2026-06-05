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
import com.example.fleetmanagement.database.AppDatabase
import com.example.fleetmanagement.models.Vehicle
import kotlinx.coroutines.launch
import api.RetrofitClient

@Composable
fun VehiclesScreen(
    database: AppDatabase,
    navController: NavController
) {
    val context = LocalContext.current

    var vehicles by remember { mutableStateOf(listOf<Vehicle>()) }

    var plate by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("") }
    var model by remember { mutableStateOf("") }
    var year by remember { mutableStateOf("") }

    var editingVehicle by remember { mutableStateOf<Vehicle?>(null) }

    val scope = rememberCoroutineScope()

    suspend fun refresh() {
        try {
            val response =
                RetrofitClient.api.getVehicles()

            if (response.isSuccessful) {
                vehicles =
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
        Spacer(modifier = Modifier.height(8.dp))

        Button(onClick = {
            navController.navigate("login") {
                popUpTo(0)
            }
        }) {
            Text("Logout")
        }
        Text("Vehicles", style = MaterialTheme.typography.headlineMedium)

        Spacer(modifier = Modifier.height(16.dp))

        Row {

            Button(onClick = {
                navController.navigate("drivers")
            }) {
                Text("Drivers")
            }

            Spacer(modifier = Modifier.width(12.dp))

            Button(onClick = {
                navController.navigate("routes")
            }) {
                Text("Routes")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = plate,
            onValueChange = { plate = it },
            label = { Text("Plate Number") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = type,
            onValueChange = { type = it },
            label = { Text("Type") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = model,
            onValueChange = { model = it },
            label = { Text("Model") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = year,
            onValueChange = { year = it },
            label = { Text("Year") }
        )

        Spacer(modifier = Modifier.height(16.dp))

        Button(onClick = {

            scope.launch {
                try {
                    if (editingVehicle == null) {
                        RetrofitClient.api.createVehicle(
                            plate = plate,
                            type = type,
                            model = model,
                            year = year.toIntOrNull() ?: 0
                        )
                    } else {
                        RetrofitClient.api.updateVehicle(
                            id = editingVehicle!!.vehicle_id,
                            plate = plate,
                            type = type,
                            model = model,
                            year = year.toIntOrNull() ?: 0
                        )
                        editingVehicle = null
                    }

                    plate = ""
                    type = ""
                    model = ""
                    year = ""

                    refresh()
                } catch (e: Exception) {
                    Toast.makeText(context, "Action failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }

        }) {

            Text(
                if (editingVehicle == null)
                    "Add Vehicle"
                else
                    "Update Vehicle"
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn {

            items(vehicles) { vehicle ->

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                ) {

                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {

                        Text(vehicle.plate_number)
                        Text(vehicle.model)
                        Text(vehicle.type)
                        Text(vehicle.year.toString())

                        Spacer(modifier = Modifier.height(12.dp))

                        Row {

                            Button(onClick = {

                                editingVehicle = vehicle

                                plate = vehicle.plate_number
                                type = vehicle.type
                                model = vehicle.model
                                year = vehicle.year.toString()

                            }) {
                                Text("Edit")
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Button(onClick = {

                                scope.launch {
                                    try {
                                        RetrofitClient.api.deleteVehicle(
                                            vehicle.vehicle_id
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