package com.example.fleetmanagement.models

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "routes")
data class Route(

    @PrimaryKey(autoGenerate = true)
    val route_id: Int = 0,

    val vehicle_id: Int?,

    val planned_start: String,

    val planned_end: String,

    val start_point: String,

    val end_point: String,

    val status: String
)