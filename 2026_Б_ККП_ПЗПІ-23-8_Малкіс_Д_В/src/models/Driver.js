const { getDB } = require('../config/database');

class Driver {

    static async getAll() {
        const db = getDB();
        const connection = await db.getConnection();
    
        try {
            const [rows] = await connection.execute(`
                SELECT d.*,
                       v.plate_number AS vehicle_plate,
                       v.model AS vehicle_model
                FROM drivers d
                LEFT JOIN vehicles v ON d.vehicle_id = v.vehicle_id
                ORDER BY d.driver_id DESC
            `);
            return rows;
        } finally {
            connection.release();
        }
    }

    static async getById(id) {
        const db = getDB();
        const connection = await db.getConnection();
    
        try {
            const [rows] = await connection.execute(`
                SELECT d.*,
                       v.plate_number AS vehicle_plate,
                       v.model AS vehicle_model
                FROM drivers d
                LEFT JOIN vehicles v ON d.vehicle_id = v.vehicle_id
                WHERE d.driver_id = ?
            `, [id]);
            return rows[0] || null;
        } finally {
            connection.release();
        }
    }
    
    static async create(name, contact, license_number, status = 'active') {
        const db = getDB();
        const connection = await db.getConnection();

        try {
            const [existingName] = await connection.execute(
                'SELECT driver_id FROM drivers WHERE name = ?',
                [name]
            );
            if (existingName.length > 0) {
                throw new Error('Імʼя вже використовується');
            }

            const [existingContact] = await connection.execute(
                'SELECT driver_id FROM drivers WHERE contact = ?',
                [contact]
            );
            if (existingContact.length > 0) {
                throw new Error('Телефон вже використовується');
            }

            const [existingLicense] = await connection.execute(
                'SELECT driver_id FROM drivers WHERE license_number = ?',
                [license_number]
            );
            if (existingLicense.length > 0) {
                throw new Error('Номер посвідчення вже використовується');
            }

            const [result] = await connection.execute(
                `INSERT INTO drivers (name, contact, license_number, status)
                 VALUES (?, ?, ?, ?)`,
                [name, contact, license_number, status]
            );

            return { driver_id: result.insertId };
        } finally {
            connection.release();
        }
    }

    static async update(id, name, contact, license_number, status) {
        const db = getDB();
        const connection = await db.getConnection();

        try {
            const [existingName] = await connection.execute(
                'SELECT driver_id FROM drivers WHERE name = ? AND driver_id != ?',
                [name, id]
            );
            if (existingName.length > 0) {
                throw new Error('Імʼя вже використовується');
            }

            const [existingContact] = await connection.execute(
                'SELECT driver_id FROM drivers WHERE contact = ? AND driver_id != ?',
                [contact, id]
            );
            if (existingContact.length > 0) {
                throw new Error('Телефон вже використовується');
            }

            const [existingLicense] = await connection.execute(
                'SELECT driver_id FROM drivers WHERE license_number = ? AND driver_id != ?',
                [license_number, id]
            );
            if (existingLicense.length > 0) {
                throw new Error('Номер посвідчення вже використовується');
            }

            const [result] = await connection.execute(
                `UPDATE drivers
                 SET name = ?, contact = ?, license_number = ?, status = ?
                 WHERE driver_id = ?`,
                [name, contact, license_number, status, id]
            );

            return result.affectedRows > 0;
        } finally {
            connection.release();
        }
    }

    static async delete(id) {
        const db = getDB();
        const connection = await db.getConnection();

        try {
            const [result] = await connection.execute(
                'DELETE FROM drivers WHERE driver_id = ?',
                [id]
            );

            return result.affectedRows > 0;
        } finally {
            connection.release();
        }
    }

    static async assignVehicle(driver_id, vehicle_id) {
        const db = getDB();
        const connection = await db.getConnection();
    
        try {
            const [existing] = await connection.execute(
                'SELECT driver_id FROM drivers WHERE vehicle_id = ?',
                [vehicle_id]
            );
            if (existing.length > 0) throw new Error('Цей транспорт вже зайнятий');
    
            await connection.execute(
                'UPDATE drivers SET vehicle_id = ? WHERE driver_id = ?',
                [vehicle_id, driver_id]
            );
    
            return { driver_id, vehicle_id };
        } finally {
            connection.release();
        }
    }

    static async unassignVehicle(driver_id) {
        const db = getDB();
        const connection = await db.getConnection();

        try {
            await connection.execute(
                'UPDATE drivers SET vehicle_id = NULL WHERE driver_id = ?',
                [driver_id]
            );

            return true;
        } finally {
            connection.release();
        }
    }

    static async getAvailableVehicles() {
        const db = getDB();
        const connection = await db.getConnection();

        try {
            const [rows] = await connection.execute(`
                SELECT v.*
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                WHERE d.vehicle_id IS NULL
                ORDER BY v.vehicle_id DESC
            `);

            return rows;
        } finally {
            connection.release();
        }
    }

    static async getAvailableDrivers() {
        const db = getDB();
        const connection = await db.getConnection();

        try {
            const [rows] = await connection.execute(`
                SELECT *
                FROM drivers
                WHERE vehicle_id IS NULL
                ORDER BY driver_id DESC
            `);

            return rows;
        } finally {
            connection.release();
        }
    }
}

module.exports = Driver;
