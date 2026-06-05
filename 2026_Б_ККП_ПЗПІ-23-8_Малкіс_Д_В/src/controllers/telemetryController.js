const db = require('../config/database');

const telemetryController = {
    getAllTelemetry: async (req, res) => {
        try {
            const [telemetry] = await db.getDB().execute(`
                SELECT t.*, v.plate_number, v.model
                FROM telemetry t
                LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
                ORDER BY t.timestamp DESC
            `);
            
            res.json({
                success: true,
                data: telemetry,
                count: telemetry.length
            });
        } catch (error) {
            console.error('Error fetching telemetry:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    getActiveTrips: async (req, res) => {
        try {
            const [trips] = await db.getDB().execute(`
                SELECT t.*, v.plate_number, v.model, r.start_point, r.end_point
                FROM telemetry t
                LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
                LEFT JOIN routes r ON t.route_id = r.route_id
                WHERE t.status = 'active'
                ORDER BY t.start_time DESC
            `);
            
            res.json({
                success: true,
                data: trips,
                count: trips.length
            });
        } catch (error) {
            console.error('Error fetching active trips:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    getTripStats: async (req, res) => {
        try {
            const [stats] = await db.getDB().execute(`
                SELECT 
                    COUNT(*) as total_trips,
                    SUM(duration) as total_duration,
                    AVG(duration) as avg_duration,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_trips
                FROM telemetry
            `);
            
            res.json({
                success: true,
                data: stats[0]
            });
        } catch (error) {
            console.error('Error fetching trip stats:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    getTelemetryById: async (req, res) => {
        try {
            const id = req.params.id;
            const [telemetry] = await db.getDB().execute(`
                SELECT t.*, v.plate_number, v.model, r.start_point, r.end_point
                FROM telemetry t
                LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
                LEFT JOIN routes r ON t.route_id = r.route_id
                WHERE t.telemetry_id = ?
            `, [id]);
            
            if (telemetry.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Telemetry record not found'
                });
            }
            
            res.json({
                success: true,
                data: telemetry[0]
            });
        } catch (error) {
            console.error('Error fetching telemetry by id:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    getTelemetryByVehicle: async (req, res) => {
        try {
            const vehicleId = req.params.vehicleId;
            const [telemetry] = await db.getDB().execute(`
                SELECT t.*, v.plate_number, v.model, r.start_point, r.end_point
                FROM telemetry t
                LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
                LEFT JOIN routes r ON t.route_id = r.route_id
                WHERE t.vehicle_id = ?
                ORDER BY t.timestamp DESC
            `, [vehicleId]);
            
            res.json({
                success: true,
                data: telemetry,
                count: telemetry.length
            });
        } catch (error) {
            console.error('Error fetching telemetry by vehicle:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    startTrip: async (req, res) => {
        try {
            const {
                vehicle_id,
                route_id,
                start_point,
                end_point,
                start_time,
                timestamp,
                status = 'active'
            } = req.body;

            console.log('Starting trip with data:', req.body);

            if (!vehicle_id || !start_point || !end_point) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    required: ['vehicle_id', 'start_point', 'end_point']
                });
            }

            const [vehicles] = await db.getDB().execute(
                'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?',
                [vehicle_id]
            );

            if (vehicles.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Vehicle not found'
                });
            }

            if (route_id) {
                const [routes] = await db.getDB().execute(
                    'SELECT route_id FROM routes WHERE route_id = ?',
                    [route_id]
                );

                if (routes.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Route not found'
                    });
                }
            }

            const now = new Date().toISOString();
            const tripStartTime = start_time || now;
            const tripTimestamp = timestamp || now;

            const [result] = await db.getDB().execute(`
                INSERT INTO telemetry 
                (vehicle_id, route_id, start_point, end_point, start_time, timestamp, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [vehicle_id, route_id || null, start_point, end_point, tripStartTime, tripTimestamp, status]);

            const [createdTelemetry] = await db.getDB().execute(`
                SELECT 
                    t.*,
                    v.plate_number,
                    v.model,
                    r.start_point as route_start,
                    r.end_point as route_end
                FROM telemetry t
                LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
                LEFT JOIN routes r ON t.route_id = r.route_id
                WHERE t.telemetry_id = ?
            `, [result.insertId]);

            console.log('Trip started successfully, ID:', result.insertId);

            res.status(201).json({
                success: true,
                message: 'Trip started successfully',
                telemetry: createdTelemetry[0],
                telemetry_id: result.insertId
            });

        } catch (error) {
            console.error('Error starting trip:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    endTrip: async (req, res) => {
        try {
            const { telemetry_id, end_point, end_time, status = 'completed', duration } = req.body;

            console.log('Ending trip with data:', req.body);

            if (!telemetry_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Telemetry ID is required'
                });
            }

            const [existing] = await db.getDB().execute(
                'SELECT telemetry_id FROM telemetry WHERE telemetry_id = ?',
                [telemetry_id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Telemetry record not found'
                });
            }

            const endTime = end_time || new Date().toISOString();

            await db.getDB().execute(`
                UPDATE telemetry 
                SET 
                    end_point = ?, 
                    end_time = ?, 
                    status = ?, 
                    duration = ?
                WHERE telemetry_id = ?
            `, [end_point || null, endTime, status, duration || null, telemetry_id]);

            console.log('Trip ended successfully for ID:', telemetry_id);

            res.json({
                success: true,
                message: 'Trip ended successfully'
            });

        } catch (error) {
            console.error('Error ending trip:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    updateTelemetry: async (req, res) => {
        try {
            const telemetry_id = req.params.telemetry_id;
            const { status, timestamp } = req.body;

            console.log('Updating telemetry:', { telemetry_id, ...req.body });

            if (!telemetry_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Telemetry ID is required'
                });
            }

            const [existing] = await db.getDB().execute(
                'SELECT telemetry_id FROM telemetry WHERE telemetry_id = ?',
                [telemetry_id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Telemetry record not found'
                });
            }

            const updateTime = timestamp || new Date().toISOString();

            await db.getDB().execute(
                'UPDATE telemetry SET status = ?, timestamp = ? WHERE telemetry_id = ?',
                [status, updateTime, telemetry_id]
            );

            console.log('Telemetry updated successfully for ID:', telemetry_id);

            res.json({
                success: true,
                message: 'Telemetry updated successfully'
            });

        } catch (error) {
            console.error('Error updating telemetry:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    deleteTelemetry: async (req, res) => {
        try {
            const id = req.params.id;

            const [existing] = await db.getDB().execute(
                'SELECT telemetry_id FROM telemetry WHERE telemetry_id = ?',
                [id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Telemetry record not found'
                });
            }

            await db.getDB().execute(
                'DELETE FROM telemetry WHERE telemetry_id = ?',
                [id]
            );

            res.json({
                success: true,
                message: 'Telemetry record deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting telemetry:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    }
};

module.exports = telemetryController;