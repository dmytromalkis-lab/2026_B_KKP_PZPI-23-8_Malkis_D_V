const mysql = require('mysql2/promise');

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'FleetManagementDB',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
};

let pool = null;

async function connectDB() {
    try {
        console.log('🔗 Connecting to MySQL...');
        pool = mysql.createPool(config);

        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database!');
        connection.release();

        await setupTables();
        return pool;

    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        throw error;
    }
}

function getDB() {
    if (!pool) {
        throw new Error('Database not connected. Call connectDB() first.');
    }
    return pool;
}

async function setupTables() {
    const connection = await pool.getConnection();

    try {
        console.log('🔄 Setting up tables...');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                Email VARCHAR(255) NOT NULL,
                Password VARCHAR(255) NOT NULL,
                Name VARCHAR(255) NOT NULL,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT UQ_Users_Email UNIQUE (Email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS vehicles (
                vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
                plate_number VARCHAR(20) NOT NULL,
                type VARCHAR(50) NOT NULL,
                model VARCHAR(50) NOT NULL,
                year INT NOT NULL,
                CONSTRAINT UQ_Vehicles_Plate UNIQUE (plate_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS drivers (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS routes (
                route_id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id INT NULL,
                planned_start DATETIME NOT NULL,
                planned_end DATETIME NOT NULL,
                start_point VARCHAR(100) NOT NULL,
                end_point VARCHAR(100) NOT NULL,
                status ENUM('planned', 'active', 'completed', 'cancelled')
                    NOT NULL DEFAULT 'planned',

                CONSTRAINT FK_Routes_Vehicles
                    FOREIGN KEY (vehicle_id)
                    REFERENCES vehicles(vehicle_id)
                    ON DELETE SET NULL,

                INDEX IDX_Routes_Start (planned_start),
                INDEX IDX_Routes_Vehicle (vehicle_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS telemetry (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS telemetry_records (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        console.log('✅ All tables setup complete');

    } catch (error) {
        console.error('❌ Error setting up tables:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    connectDB,
    getDB
};