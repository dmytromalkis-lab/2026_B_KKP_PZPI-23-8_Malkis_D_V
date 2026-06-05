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
import api.RetrofitClient
import androidx.navigation.NavController
import com.example.fleetmanagement.database.AppDatabase
import com.example.fleetmanagement.models.Driver
import kotlinx.coroutines.launch

@Composable
fun DriversScreen(
    database: AppDatabase,
    navController: NavController
) {
    val context = LocalContext.current

    var drivers by remember { mutableStateOf(listOf<Driver>()) }

    var name by remember { mutableStateOf("") }
    var contact by remember { mutableStateOf("") }
    var license by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("") }

    var vehicleId by remember { mutableStateOf("") }
    var createdAt by remember { mutableStateOf("") }

    var editingDriver by remember { mutableStateOf<Driver?>(null) }

    val scope = rememberCoroutineScope()

    suspend fun refresh() {
        try {
            val response =
                RetrofitClient.api.getDrivers()

            if (response.isSuccessful) {
                drivers =
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
        Text(
            text = "Drivers",
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(16.dp))

        Row {

            Button(onClick = {
                navController.navigate("vehicles")
            }) {
                Text("Vehicles")
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
            value = name,
            onValueChange = { name = it },
            label = { Text("Name") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = contact,
            onValueChange = { contact = it },
            label = { Text("Contact") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = license,
            onValueChange = { license = it },
            label = { Text("License Number") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = status,
            onValueChange = { status = it },
            label = { Text("Status") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = vehicleId,
            onValueChange = { vehicleId = it },
            label = { Text("Vehicle ID") }
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
            value = createdAt,
            onValueChange = { createdAt = it },
            label = { Text("Created At") }
        )

        Spacer(modifier = Modifier.height(16.dp))

        Button(onClick = {

            scope.launch {
                try {
                    if (editingDriver == null) {
                        RetrofitClient.api.createDriver(
                            name = name,
                            contact = contact,
                            license = license,
                            status = status,
                            vehicleId = vehicleId,
                            createdAt = createdAt
                        )
                    } else {
                        RetrofitClient.api.updateDriver(
                            id = editingDriver!!.driver_id,
                            name = name,
                            contact = contact,
                            license = license,
                            status = status,
                            vehicleId = vehicleId,
                            createdAt = createdAt
                        )
                        editingDriver = null
                    }

                    name = ""
                    contact = ""
                    license = ""
                    status = ""
                    vehicleId = ""
                    createdAt = ""

                    refresh()
                } catch (e: Exception) {
                    Toast.makeText(context, "Action failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }

        }) {

            Text(
                if (editingDriver == null)
                    "Add Driver"
                else
                    "Update Driver"
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn {

            items(drivers) { driver ->

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                ) {

                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {

                        Text(driver.name)
                        Text(driver.contact)
                        Text(driver.license_number)
                        Text(driver.status)

                        Text("Vehicle ID: ${driver.vehicle_id}")
                        Text("Created At: ${driver.created_at}")

                        Spacer(modifier = Modifier.height(12.dp))

                        Row {

                            Button(onClick = {

                                editingDriver = driver

                                name = driver.name
                                contact = driver.contact
                                license = driver.license_number
                                status = driver.status

                                vehicleId =
                                    driver.vehicle_id?.toString() ?: ""

                                createdAt = driver.created_at

                            }) {
                                Text("Edit")
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Button(onClick = {

                                scope.launch {
                                    try {
                                        RetrofitClient.api.deleteDriver(
                                            driver.driver_id
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