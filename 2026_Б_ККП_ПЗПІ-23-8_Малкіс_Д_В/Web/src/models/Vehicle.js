const { getDB } = require('../config/database');

class Vehicle {
   
    static async getAll() {
        const db = getDB();
        const connection = await db.getConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT v.*, 
                       d.driver_id,
                       d.name AS driver_name,
                       d.contact AS driver_contact,
                       d.license_number,
                       d.status AS driver_status
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                ORDER BY v.vehicle_id DESC
            `);
            return rows;
        } finally {
            connection.release();
        }
    }

    // Отримати транспортний засіб по ID
    static async getById(id) {
        const db = getDB();
        const connection = await db.getConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT v.*, 
                       d.driver_id,
                       d.name AS driver_name,
                       d.contact AS driver_contact,
                       d.license_number,
                       d.status AS driver_status
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                WHERE v.vehicle_id = ?
            `, [id]);
            return rows[0] || null;
        } finally {
            connection.release();
        }
    }

    static async create(vehicleData) {
        const db = getDB();
        const connection = await db.getConnection();
        try {
            console.log('🔍 Model.create() called with:', vehicleData);
            
            const { plate_number, type, model, year } = vehicleData;
            
            if (!plate_number || !type || !model || year === undefined || year === null) {
                console.log('❌ Missing fields:', { plate_number, type, model, year });
                throw new Error('plate_number, type, model та year обовʼязкові для створення транспортного засобу');
            }

            const plateRegex = /^[A-Za-z0-9]+$/;
            if (!plateRegex.test(plate_number)) {
                throw new Error('Номерний знак має містити тільки латинські літери та цифри');
            }

            const formattedPlate = plate_number.toUpperCase();

            const [existing] = await connection.execute(
                'SELECT vehicle_id FROM vehicles WHERE plate_number = ?',
                [formattedPlate]
            );
            if (existing.length > 0) throw new Error('Номерний знак вже використовується');

            const yearNum = parseInt(year);
            if (isNaN(yearNum)) {
                throw new Error('Рік має бути числом');
            }

            const [result] = await connection.execute(
                'INSERT INTO vehicles (plate_number, type, model, year) VALUES (?, ?, ?, ?)',
                [formattedPlate, type, model, yearNum]
            );

            return { 
                vehicle_id: result.insertId, 
                plate_number: formattedPlate, 
                type, 
                model, 
                year: yearNum 
            };
        } finally {
            connection.release();
        }
    }

    static async update(id, updateData) {
        const db = getDB();
        const connection = await db.getConnection();
        try {
            console.log('🔍 Model.update() called with ID:', id, 'Data:', updateData);
            
            const { plate_number, type, model, year } = updateData;
            
            if (plate_number) {
                const [existing] = await connection.execute(
                    'SELECT vehicle_id FROM vehicles WHERE plate_number = ? AND vehicle_id != ?',
                    [plate_number.toUpperCase(), id]
                );
                if (existing.length > 0) throw new Error('Номерний знак вже використовується');
            }

            const updates = [];
            const values = [];
            
            if (plate_number !== undefined) {
                updates.push('plate_number = ?');
                values.push(plate_number.toUpperCase());
            }
            if (type !== undefined) {
                updates.push('type = ?');
                values.push(type);
            }
            if (model !== undefined) {
                updates.push('model = ?');
                values.push(model);
            }
            if (year !== undefined) {
                const yearNum = parseInt(year);
                if (isNaN(yearNum)) {
                    throw new Error('Рік має бути числом');
                }
                updates.push('year = ?');
                values.push(yearNum);
            }
            
            if (updates.length === 0) {
                throw new Error('Немає даних для оновлення');
            }
            
            values.push(id);
            
            const [result] = await connection.execute(
                `UPDATE vehicles SET ${updates.join(', ')} WHERE vehicle_id = ?`,
                values
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

            await connection.beginTransaction();

            try {

                const [vehicle] = await connection.execute(
                    'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?',
                    [id]
                );
                
                if (vehicle.length === 0) {
                    throw new Error('Транспортний засіб не знайдено');
                }

                await connection.execute(
                    'UPDATE drivers SET vehicle_id = NULL WHERE vehicle_id = ?',
                    [id]
                );

                await connection.execute(
                    'UPDATE routes SET vehicle_id = NULL WHERE vehicle_id = ?',
                    [id]
                );

                await connection.execute(
                    'UPDATE telemetry SET vehicle_id = NULL WHERE vehicle_id = ?',
                    [id]
                );

                await connection.execute(
                    'UPDATE fuellogs SET vehicle_id = NULL WHERE vehicle_id = ?',
                    [id]
                );

                const [result] = await connection.execute(
                    'DELETE FROM vehicles WHERE vehicle_id = ?',
                    [id]
                );

                await connection.commit();
                return result.affectedRows > 0;
            } catch (error) {

                await connection.rollback();
                throw error;
            }
        } finally {
            connection.release();
        }
    }

    static async findByPlateNumber(plate_number) {
        const db = getDB();
        const connection = await db.getConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT v.*, 
                       d.driver_id,
                       d.name AS driver_name,
                       d.contact AS driver_contact,
                       d.license_number,
                       d.status AS driver_status
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                WHERE v.plate_number = ?
            `, [plate_number.toUpperCase()]);
            return rows[0] || null;
        } finally {
            connection.release();
        }
    }

    static async getUnassigned() {
        const db = getDB();
        const connection = await db.getConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT v.* 
                FROM vehicles v
                WHERE v.vehicle_id NOT IN (
                    SELECT DISTINCT vehicle_id 
                    FROM drivers 
                    WHERE vehicle_id IS NOT NULL
                )
                ORDER BY v.vehicle_id DESC
            `);
            return rows;
        } finally {
            connection.release();
        }
    }

    static async getAssigned() {
        const db = getDB();
        const connection = await db.getConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT v.*, 
                       d.driver_id,
                       d.name AS driver_name,
                       d.contact AS driver_contact,
                       d.license_number,
                       d.status AS driver_status
                FROM vehicles v
                INNER JOIN drivers d ON v.vehicle_id = d.vehicle_id
                ORDER BY v.vehicle_id DESC
            `);
            return rows;
        } finally {
            connection.release();
        }
    }

    static async assignDriver(vehicle_id, driver_id) {
        const db = getDB();
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            try {
                const [vehicle] = await connection.execute(
                    'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?',
                    [vehicle_id]
                );
                if (vehicle.length === 0) {
                    throw new Error('Транспортний засіб не знайдено');
                }

                const [driver] = await connection.execute(
                    'SELECT driver_id, vehicle_id FROM drivers WHERE driver_id = ?',
                    [driver_id]
                );
                if (driver.length === 0) {
                    throw new Error('Водій не знайдено');
                }

                const [currentDriver] = await connection.execute(
                    'SELECT driver_id FROM drivers WHERE vehicle_id = ?',
                    [vehicle_id]
                );
                if (currentDriver.length > 0) {
                    await connection.execute(
                        'UPDATE drivers SET vehicle_id = NULL WHERE driver_id = ?',
                        [currentDriver[0].driver_id]
                    );
                }

                if (driver[0].vehicle_id) {
                    await connection.execute(
                        'UPDATE drivers SET vehicle_id = NULL WHERE vehicle_id = ?',
                        [driver[0].vehicle_id]
                    );
                }

                const [result] = await connection.execute(
                    'UPDATE drivers SET vehicle_id = ? WHERE driver_id = ?',
                    [vehicle_id, driver_id]
                );

                await connection.commit();
                return result.affectedRows > 0;
            } catch (error) {
                await connection.rollback();
                throw error;
            }
        } finally {
            connection.release();
        }
    }

    static async unassignDriver(driver_id) {
        const db = getDB();
        const connection = await db.getConnection();
        try {
            const [result] = await connection.execute(
                'UPDATE drivers SET vehicle_id = NULL WHERE driver_id = ?',
                [driver_id]
            );
            return result.affectedRows > 0;
        } finally {
            connection.release();
        }
    }

    static async getStats() {
        const db = getDB();
        const connection = await db.getConnection();
        try {
            const [stats] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_vehicles,
                    COUNT(DISTINCT d.driver_id) as assigned_vehicles,
                    COUNT(*) - COUNT(DISTINCT d.driver_id) as unassigned_vehicles,
                    v.type,
                    COUNT(*) as count_by_type
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                GROUP BY v.type
            `);
            return stats;
        } finally {
            connection.release();
        }
    }

    static async getRouteHistory(vehicle_id) {
        const db = getDB();
        const connection = await db.getConnection();
        try {
            const [rows] = await connection.execute(`
                SELECT 
                    r.*,
                    v.plate_number,
                    v.model as vehicle_model
                FROM routes r
                LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
                WHERE r.vehicle_id = ?
                ORDER BY r.planned_start DESC
            `, [vehicle_id]);
            return rows;
        } finally {
            connection.release();
        }
    }
}
module.exports = Vehicle;