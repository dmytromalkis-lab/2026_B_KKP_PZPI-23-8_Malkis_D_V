package com.example.fleetmanagement.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.fleetmanagement.models.Driver
import com.example.fleetmanagement.models.Route
import com.example.fleetmanagement.models.Vehicle

@Database(
    entities = [Vehicle::class, Driver::class, Route::class],
    version = 2
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun fleetDao(): FleetDao

    companion object {

        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {

                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "fleet_database"
                )
                    .fallbackToDestructiveMigration(false)
                    .build()

                INSTANCE = instance
                instance
            }
        }
    }
}