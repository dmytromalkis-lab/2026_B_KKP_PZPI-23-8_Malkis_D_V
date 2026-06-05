CREATE DATABASE IF NOT EXISTS FleetManagementDB
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE FleetManagementDB;

CREATE TABLE users (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Email VARCHAR(255) NOT NULL,
    Password VARCHAR(255) NOT NULL,
    Name VARCHAR(255) NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT UQ_Users_Email UNIQUE (Email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,

    CONSTRAINT UQ_Vehicles_Plate UNIQUE (plate_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE drivers (
    driver_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(50) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    status ENUM('active', 'inactive', 'vacation') DEFAULT 'active',
    vehicle_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT UQ_Drivers_Name UNIQUE (name),
    CONSTRAINT UQ_Drivers_Contact UNIQUE (contact),
    CONSTRAINT UQ_Drivers_License UNIQUE (license_number),

    CONSTRAINT FK_Drivers_Vehicles
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(vehicle_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE routes (
    route_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NULL,
    planned_start DATETIME NOT NULL,
    planned_end DATETIME NOT NULL,
    start_point VARCHAR(100) NOT NULL,
    end_point VARCHAR(100) NOT NULL,
    status ENUM('planned', 'active', 'completed', 'cancelled') NOT NULL,

    CONSTRAINT FK_Routes_Vehicles
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(vehicle_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE telemetry (
    telemetry_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NULL,
    timestamp DATETIME NOT NULL,
    start_point VARCHAR(100) NOT NULL,
    end_point VARCHAR(100) NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    status VARCHAR(50) NULL,

    CONSTRAINT FK_Telemetry_Vehicles
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(vehicle_id)
        ON DELETE SET NULL,

    INDEX IDX_Telemetry_Time (timestamp),
    INDEX IDX_Telemetry_Vehicle (vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE telemetry_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,

    telemetry_id INT NOT NULL,
    vehicle_id INT NOT NULL,

    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,

    fuel_level INT NOT NULL COMMENT '0-100 %',
    speed DECIMAL(5,2) NULL COMMENT 'km/h',

    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT FK_TelemetryRecords_Telemetry
        FOREIGN KEY (telemetry_id)
        REFERENCES telemetry(telemetry_id)
        ON DELETE CASCADE,

    CONSTRAINT FK_TelemetryRecords_Vehicles
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(vehicle_id)
        ON DELETE CASCADE,

    INDEX IDX_TelemetryRecords_Time (recorded_at),
    INDEX IDX_TelemetryRecords_Telemetry (telemetry_id),
    INDEX IDX_TelemetryRecords_Vehicle (vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DELETE FROM drivers
WHERE driver_id = 1;
SELECT*FROM drivers;

UPDATE routes
SET
    vehicle_id = 2,
    planned_start = '2026-06-10 08:00:00',
    planned_end = '2026-06-10 14:00:00',
    start_point = 'Kharkiv',
    end_point = 'Poltava',
    status = 'active'
WHERE route_id = 1;



SELECT*FROM routes;
SELECT*FROM drivers;
SELECT*FROM routes;