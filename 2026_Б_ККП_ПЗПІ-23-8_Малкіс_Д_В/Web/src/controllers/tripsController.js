const { getDB } = require('../config/database');

class Telemetry {

    static async create({
        vehicle_id,
        route_id = null,
        start_point,
        end_point = null,
        start_time,
        end_time = null,
        status = 'active'
    }) {
        if (!vehicle_id || !start_point || !start_time) {
            throw new Error('vehicle_id, start_point та start_time обовʼязкові');
        }

        const pool = getDB();
        const connection = await pool.getConnection();

        try {
            const [result] = await connection.execute(
                `INSERT INTO telemetry 
                 (vehicle_id, route_id, start_point, end_point, start_time, end_time, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    vehicle_id,
                    route_id,
                    start_point,
                    end_point,
                    start_time,
                    end_time,
                    status
                ]
            );

            return result.insertId;
        } finally {
            connection.release();
        }
    }

    static async finishTrip(telemetry_id, end_point, end_time, status = 'completed') {
        if (!telemetry_id || !end_time) {
            throw new Error('telemetry_id та end_time обовʼязкові');
        }

        const pool = getDB();
        const connection = await pool.getConnection();

        try {
            const [result] = await connection.execute(
                `UPDATE telemetry
                 SET end_point = ?, end_time = ?, status = ?, timestamp = ?
                 WHERE telemetry_id = ?`,
                [end_point, end_time, status, new Date(), telemetry_id]
            );
            
            return result.affectedRows > 0;
        } finally {
            connection.release();
        }
    }

    static async getAll(vehicle_id = null) {
        const pool = getDB();
        const connection = await pool.getConnection();

        try {
            let query = `
                SELECT t.*, t.route_id, v.plate_number, v.model,
                       r.start_point AS route_start, r.end_point AS route_end
                FROM telemetry t
                LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
                LEFT JOIN routes r ON t.route_id = r.route_id
            `;
            let params = [];

            if (vehicle_id) {
                query += ' WHERE t.vehicle_id = ?';
                params.push(vehicle_id);
            }

            query += ' ORDER BY t.start_time DESC';

            const [rows] = await connection.execute(query, params);
            return rows;
        } finally {
            connection.release();
        }
    }

    static async getLastTrip(vehicle_id) {
        if (!vehicle_id) return null;

        const pool = getDB();
        const connection = await pool.getConnection();

        try {
            const [rows] = await connection.execute(
                `SELECT t.*, t.route_id, v.plate_number, v.model,
                        r.start_point AS route_start, r.end_point AS route_end
                 FROM telemetry t
                 LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
                 LEFT JOIN routes r ON t.route_id = r.route_id
                 WHERE t.vehicle_id = ?
                 ORDER BY t.telemetry_id DESC
                 LIMIT 1`,
                [vehicle_id]
            );

            return rows.length ? rows[0] : null;
        } finally {
            connection.release();
        }
    }

    static async getActiveTrips() {
        const pool = getDB();
        const connection = await pool.getConnection();

        try {
            const [rows] = await connection.execute(`
                SELECT t.*, t.route_id, v.plate_number, v.model, d.name AS driver_name,
                       r.start_point AS route_start, r.end_point AS route_end
                FROM telemetry t
                LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                LEFT JOIN routes r ON t.route_id = r.route_id
                WHERE t.end_time IS NULL
                ORDER BY t.start_time DESC
            `);
            
            return rows;
        } finally {
            connection.release();
        }
    }

    static async getById(telemetry_id) {
        const pool = getDB();
        const connection = await pool.getConnection();

        try {
            const [rows] = await connection.execute(
                `SELECT t.*, t.route_id, v.plate_number, v.model,
                        r.start_point AS route_start, r.end_point AS route_end
                 FROM telemetry t
                 LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
                 LEFT JOIN routes r ON t.route_id = r.route_id
                 WHERE t.telemetry_id = ?`,
                [telemetry_id]
            );
            
            return rows.length ? rows[0] : null;
        } finally {
            connection.release();
        }
    }

    static async updateStatus(telemetry_id, status) {
        const pool = getDB();
        const connection = await pool.getConnection();

        try {
            const [result] = await connection.execute(
                `UPDATE telemetry
                 SET status = ?, timestamp = ?
                 WHERE telemetry_id = ?`,
                [status, new Date(), telemetry_id]
            );
            
            return result.affectedRows > 0;
        } finally {
            connection.release();
        }
    }

    static async getRoutesForDropdown(statusFilter = null) {
        const pool = getDB();
        const connection = await pool.getConnection();

        try {
            let query = `
                SELECT r.route_id, r.start_point, r.end_point, r.status, r.vehicle_id,
                       COALESCE(v.plate_number, '—') AS plate_number, v.model
                FROM routes r
                LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
            `;
            const params = [];

            if (statusFilter) {
                const statuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
                query += ` WHERE r.status IN (${statuses.map(() => '?').join(', ')})`;
                params.push(...statuses);
            }

            query += ` ORDER BY r.planned_start DESC`;

            const [rows] = await connection.execute(query, params);

            return { success: true, data: rows };
        } finally {
            connection.release();
        }
    }
}

module.exports = Telemetry;
