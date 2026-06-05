const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');

async function getConnection() {
    const db = getDB();
    return await db.getConnection();
}

router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const query = `
            SELECT 
                r.route_id,
                r.vehicle_id,
                r.planned_start,
                r.planned_end,
                r.start_point,
                r.end_point,
                r.status,
                v.plate_number,
                v.model
            FROM routes r
            LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
            ORDER BY r.planned_start DESC
        `;
        
        const [routes] = await connection.execute(query);
        
        res.json({
            success: true,
            data: routes
        });
    } catch (error) {
        console.error('Error fetching routes:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/simple', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const query = `
            SELECT 
                r.route_id,
                r.vehicle_id,
                r.planned_start,
                r.planned_end,
                r.start_point,
                r.end_point,
                r.status,
                COALESCE(v.plate_number, '—') AS plate_number,
                v.model
            FROM routes r
            LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
            ORDER BY r.planned_start DESC
        `;
        
        const [routes] = await connection.execute(query);
        
        res.json(routes);
    } catch (error) {
        console.error('Error fetching routes for dropdown:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/vehicles/list', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [vehicles] = await connection.execute(`
            SELECT vehicle_id, plate_number, model, type, year
            FROM vehicles
            ORDER BY plate_number
        `);
        
        res.json({
            success: true,
            data: vehicles
        });
    } catch (error) {
        console.error('Error fetching vehicles list:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

router.post('/', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const { 
            vehicle_id, 
            start_point, 
            end_point, 
            planned_start, 
            planned_end, 
            status = 'planned' 
        } = req.body;

        if (!start_point || !end_point || !planned_start || !planned_end) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        if (vehicle_id) {
            const [vehicle] = await connection.execute(
                'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?',
                [vehicle_id]
            );
            
            if (vehicle.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Vehicle not found'
                });
            }
        }

        const startDate = new Date(planned_start);
        const endDate = new Date(planned_end);
        
        if (endDate <= startDate) {
            return res.status(400).json({
                success: false,
                error: 'End time must be after start time'
            });
        }

        const [result] = await connection.execute(
            `INSERT INTO routes 
             (vehicle_id, start_point, end_point, planned_start, planned_end, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [vehicle_id || null, start_point, end_point, planned_start, planned_end, status]
        );

        const [newRoute] = await connection.execute(`
            SELECT 
                r.route_id,
                r.vehicle_id,
                r.planned_start,
                r.planned_end,
                r.start_point,
                r.end_point,
                r.status,
                v.plate_number,
                v.model
            FROM routes r
            LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
            WHERE r.route_id = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Route created successfully',
            data: newRoute[0]
        });
    } catch (error) {
        console.error('Error creating route:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/:id', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const routeId = req.params.id;
        
        if (isNaN(routeId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid route ID'
            });
        }
        
        const [routes] = await connection.execute(`
            SELECT 
                r.route_id,
                r.vehicle_id,
                r.planned_start,
                r.planned_end,
                r.start_point,
                r.end_point,
                r.status,
                v.plate_number,
                v.model
            FROM routes r
            LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
            WHERE r.route_id = ?
        `, [routeId]);
        
        if (routes.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Route not found'
            });
        }
        
        res.json({
            success: true,
            data: routes[0]
        });
    } catch (error) {
        console.error('Error fetching route:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

router.put('/:id', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const routeId = req.params.id;
        const { 
            vehicle_id, 
            start_point, 
            end_point, 
            planned_start, 
            planned_end, 
            status 
        } = req.body;

        if (isNaN(routeId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid route ID'
            });
        }

        const [existingRoute] = await connection.execute(
            'SELECT * FROM routes WHERE route_id = ?',
            [routeId]
        );
        
        if (existingRoute.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Route not found'
            });
        }

        const updateFields = [];
        const updateValues = [];
        
        if (vehicle_id !== undefined) {
            updateFields.push('vehicle_id = ?');
            updateValues.push(vehicle_id || null);
        }
        if (start_point !== undefined) {
            updateFields.push('start_point = ?');
            updateValues.push(start_point);
        }
        if (end_point !== undefined) {
            updateFields.push('end_point = ?');
            updateValues.push(end_point);
        }
        if (planned_start !== undefined) {
            updateFields.push('planned_start = ?');
            updateValues.push(planned_start);
        }
        if (planned_end !== undefined) {
            updateFields.push('planned_end = ?');
            updateValues.push(planned_end);
        }
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }

        updateValues.push(routeId);
        
        await connection.execute(
            `UPDATE routes SET ${updateFields.join(', ')} WHERE route_id = ?`,
            updateValues
        );

        const [updatedRoute] = await connection.execute(`
            SELECT 
                r.route_id,
                r.vehicle_id,
                r.planned_start,
                r.planned_end,
                r.start_point,
                r.end_point,
                r.status,
                v.plate_number,
                v.model
            FROM routes r
            LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
            WHERE r.route_id = ?
        `, [routeId]);

        res.json({
            success: true,
            message: 'Route updated successfully',
            data: updatedRoute[0]
        });
    } catch (error) {
        console.error('Error updating route:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

router.delete('/:id', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const routeId = req.params.id;
        
        if (isNaN(routeId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid route ID'
            });
        }
        
        const [existingRoute] = await connection.execute(
            'SELECT route_id FROM routes WHERE route_id = ?',
            [routeId]
        );
        
        if (existingRoute.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Route not found'
            });
        }

        await connection.execute('DELETE FROM routes WHERE route_id = ?', [routeId]);
        
        res.json({
            success: true,
            message: 'Route deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting route:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;