const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
    try {
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
        
        const [routes] = await db.query(query);
        
        res.json({
            success: true,
            data: routes
        });
    } catch (error) {
        console.error('Error fetching routes:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

router.post('/', async (req, res) => {
    try {
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
            const [vehicle] = await db.query(
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

        const [result] = await db.query(
            `INSERT INTO routes 
             (vehicle_id, start_point, end_point, planned_start, planned_end, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [vehicle_id || null, start_point, end_point, planned_start, planned_end, status]
        );

        const [newRoute] = await db.query(`
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
            error: 'Internal server error'
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const routeId = req.params.id;
        
        const [routes] = await db.query(`
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
            error: 'Internal server error'
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const routeId = req.params.id;
        const { 
            vehicle_id, 
            start_point, 
            end_point, 
            planned_start, 
            planned_end, 
            status 
        } = req.body;

        const [existingRoute] = await db.query(
            'SELECT route_id FROM routes WHERE route_id = ?',
            [routeId]
        );
        
        if (existingRoute.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Route not found'
            });
        }

        await db.query(
            `UPDATE routes 
             SET vehicle_id = ?, start_point = ?, end_point = ?, 
                 planned_start = ?, planned_end = ?, status = ?
             WHERE route_id = ?`,
            [
                vehicle_id || null,
                start_point || existingRoute[0].start_point,
                end_point || existingRoute[0].end_point,
                planned_start || existingRoute[0].planned_start,
                planned_end || existingRoute[0].planned_end,
                status || existingRoute[0].status,
                routeId
            ]
        );

        const [updatedRoute] = await db.query(`
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
            error: 'Internal server error'
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const routeId = req.params.id;

        const [existingRoute] = await db.query(
            'SELECT route_id FROM routes WHERE route_id = ?',
            [routeId]
        );
        
        if (existingRoute.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Route not found'
            });
        }

        await db.query('DELETE FROM routes WHERE route_id = ?', [routeId]);
        
        res.json({
            success: true,
            message: 'Route deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting route:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;