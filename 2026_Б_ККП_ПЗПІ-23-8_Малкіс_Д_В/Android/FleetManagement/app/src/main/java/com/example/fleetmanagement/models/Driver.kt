package com.example.fleetmanagement.models

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "drivers")
data class Driver(

    @PrimaryKey(autoGenerate = true)
    val driver_id: Int = 0,

    val name: String,
    val contact: String,
    val license_number: String,
    val status: String,

    val vehicle_id: Int?,

    val created_at: String
)