package com.example.fleetmanagement.models

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "vehicles")
data class Vehicle(
    @PrimaryKey(autoGenerate = true)
    val vehicle_id: Int = 0,
    val plate_number: String,
    val type: String,
    val model: String,
    val year: Int
)