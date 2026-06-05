package com.example.fleetmanagement.database

import androidx.room.*
import com.example.fleetmanagement.models.Driver
import com.example.fleetmanagement.models.Route
import com.example.fleetmanagement.models.Vehicle

@Dao
interface FleetDao {

    // VEHICLES

    @Insert
    suspend fun insertVehicle(vehicle: Vehicle)

    @Update
    suspend fun updateVehicle(vehicle: Vehicle)

    @Delete
    suspend fun deleteVehicle(vehicle: Vehicle)

    @Query("SELECT * FROM vehicles")
    suspend fun getVehicles(): List<Vehicle>


    // DRIVERS

    @Insert
    suspend fun insertDriver(driver: Driver)

    @Update
    suspend fun updateDriver(driver: Driver)

    @Delete
    suspend fun deleteDriver(driver: Driver)

    @Query("SELECT * FROM drivers")
    suspend fun getDrivers(): List<Driver>


    // ROUTES

    @Insert
    suspend fun insertRoute(route: Route)

    @Update
    suspend fun updateRoute(route: Route)

    @Delete
    suspend fun deleteRoute(route: Route)

    @Query("SELECT * FROM routes")
    suspend fun getRoutes(): List<Route>
}