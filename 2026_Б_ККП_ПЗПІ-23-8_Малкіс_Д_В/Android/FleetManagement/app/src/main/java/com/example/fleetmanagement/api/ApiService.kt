package com.example.fleetmanagement.api

import com.example.fleetmanagement.models.Driver
import com.example.fleetmanagement.models.Route
import com.example.fleetmanagement.models.Vehicle

import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // VEHICLES

    @GET("get_vehicles.php")
    suspend fun getVehicles(): Response<List<Vehicle>>

    @FormUrlEncoded
    @POST("create_vehicle.php")
    suspend fun createVehicle(
        @Field("plate_number") plate: String,
        @Field("type") type: String,
        @Field("model") model: String,
        @Field("year") year: Int
    ): Response<String>

    @FormUrlEncoded
    @POST("update_vehicle.php")
    suspend fun updateVehicle(
        @Field("vehicle_id") id: Int,
        @Field("plate_number") plate: String,
        @Field("type") type: String,
        @Field("model") model: String,
        @Field("year") year: Int
    ): Response<String>

    @FormUrlEncoded
    @POST("delete_vehicle.php")
    suspend fun deleteVehicle(
        @Field("vehicle_id") id: Int
    ): Response<String>


    // DRIVERS

    @GET("get_drivers.php")
    suspend fun getDrivers(): Response<List<Driver>>

    @FormUrlEncoded
    @POST("create_driver.php")
    suspend fun createDriver(

        @Field("name")
        name: String,

        @Field("contact")
        contact: String,

        @Field("license_number")
        license: String,

        @Field("status")
        status: String,

        @Field("vehicle_id")
        vehicleId: String,

        @Field("created_at")
        createdAt: String

    ): Response<String>

    @FormUrlEncoded
    @POST("update_driver.php")
    suspend fun updateDriver(

        @Field("driver_id")
        id: Int,

        @Field("name")
        name: String,

        @Field("contact")
        contact: String,

        @Field("license_number")
        license: String,

        @Field("status")
        status: String,

        @Field("vehicle_id")
        vehicleId: String,

        @Field("created_at")
        createdAt: String

    ): Response<String>

    @FormUrlEncoded
    @POST("delete_driver.php")
    suspend fun deleteDriver(

        @Field("driver_id")
        id: Int

    ): Response<String>


    // ROUTES

    @GET("get_routes.php")
    suspend fun getRoutes(): Response<List<Route>>

    @FormUrlEncoded
    @POST("create_route.php")
    suspend fun createRoute(

        @Field("vehicle_id")
        vehicleId: String,

        @Field("planned_start")
        plannedStart: String,

        @Field("planned_end")
        plannedEnd: String,

        @Field("start_point")
        startPoint: String,

        @Field("end_point")
        endPoint: String,

        @Field("status")
        status: String

    ): Response<String>

    @FormUrlEncoded
    @POST("update_route.php")
    suspend fun updateRoute(

        @Field("route_id")
        id: Int,

        @Field("vehicle_id")
        vehicleId: String,

        @Field("planned_start")
        plannedStart: String,

        @Field("planned_end")
        plannedEnd: String,

        @Field("start_point")
        startPoint: String,

        @Field("end_point")
        endPoint: String,

        @Field("status")
        status: String

    ): Response<String>

    @FormUrlEncoded
    @POST("delete_route.php")
    suspend fun deleteRoute(

        @Field("route_id")
        id: Int

    ): Response<String>
}