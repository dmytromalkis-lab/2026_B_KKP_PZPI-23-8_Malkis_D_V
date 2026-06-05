const db = require('../config/database');

const vehicleController = {
    getAllVehicles: async (req, res) => {
        try {
            console.log('Getting all vehicles...');
            const [vehicles] = await db.getDB().execute(`
                SELECT v.*, d.name as driver_name, d.driver_id
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                ORDER BY v.vehicle_id DESC
            `);
            
            console.log(`Found ${vehicles.length} vehicles`);
            
            res.json({
                success: true,
                vehicles: vehicles,
                count: vehicles.length,
                message: vehicles.length > 0 ? 'Vehicles loaded successfully' : 'No vehicles found'
            });
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    getUnassignedVehicles: async (req, res) => {
        try {
            console.log('Getting unassigned vehicles...');
            const [vehicles] = await db.getDB().execute(`
                SELECT v.*
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                WHERE d.driver_id IS NULL
                ORDER BY v.plate_number
            `);
            
            console.log(`Found ${vehicles.length} unassigned vehicles`);
            
            res.json({
                success: true,
                vehicles: vehicles,
                count: vehicles.length
            });
        } catch (error) {
            console.error('Error fetching unassigned vehicles:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    getAssignedVehicles: async (req, res) => {
        try {
            console.log('Getting assigned vehicles...');
            const [vehicles] = await db.getDB().execute(`
                SELECT v.*, d.name as driver_name, d.driver_id, d.contact
                FROM vehicles v
                INNER JOIN drivers d ON v.vehicle_id = d.vehicle_id
                ORDER BY d.name
            `);
            
            console.log(`Found ${vehicles.length} assigned vehicles`);
            
            res.json({
                success: true,
                vehicles: vehicles,
                count: vehicles.length
            });
        } catch (error) {
            console.error('Error fetching assigned vehicles:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    getVehicleStats: async (req, res) => {
        try {
            console.log('Getting vehicle stats...');
            
            const [stats] = await db.getDB().execute(`
                SELECT 
                    COUNT(*) as total_vehicles,
                    COUNT(CASE WHEN d.driver_id IS NOT NULL THEN 1 END) as assigned_vehicles,
                    COUNT(CASE WHEN d.driver_id IS NULL THEN 1 END) as unassigned_vehicles,
                    COUNT(CASE WHEN type = 'вантажний' THEN 1 END) as cargo_vehicles,
                    COUNT(CASE WHEN type = 'пасажирський' THEN 1 END) as passenger_vehicles,
                    AVG(year) as avg_year,
                    MIN(year) as oldest_year,
                    MAX(year) as newest_year
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
            `);
            
            const [models] = await db.getDB().execute(`
                SELECT model, COUNT(*) as count
                FROM vehicles
                GROUP BY model
                ORDER BY count DESC
                LIMIT 10
            `);
            
            const [types] = await db.getDB().execute(`
                SELECT type, COUNT(*) as count
                FROM vehicles
                GROUP BY type
                ORDER BY count DESC
            `);
            
            console.log('Vehicle stats retrieved');
            
            res.json({
                success: true,
                stats: stats[0],
                popular_models: models,
                vehicle_types: types
            });
        } catch (error) {
            console.error('Error fetching vehicle stats:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    searchVehicles: async (req, res) => {
        try {
            const query = req.query.q;
            console.log(`Searching vehicles with query: ${query}`);
            
            if (!query || query.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Search query is required'
                });
            }
            
            const searchTerm = `%${query}%`;
            const [vehicles] = await db.getDB().execute(`
                SELECT v.*, d.name as driver_name
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                WHERE v.plate_number LIKE ? 
                   OR v.model LIKE ? 
                   OR v.type LIKE ?
                ORDER BY v.plate_number
            `, [searchTerm, searchTerm, searchTerm]);
            
            console.log(`Found ${vehicles.length} vehicles matching "${query}"`);
            
            res.json({
                success: true,
                vehicles: vehicles,
                count: vehicles.length,
                query: query
            });
        } catch (error) {
            console.error('Error searching vehicles:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    getVehicleById: async (req, res) => {
        try {
            const id = req.params.id;
            console.log(`Getting vehicle by ID: ${id}`);
            
            const [vehicles] = await db.getDB().execute(`
                SELECT v.*, d.name as driver_name, d.driver_id, d.contact, d.license_number
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                WHERE v.vehicle_id = ?
            `, [id]);
            
            if (vehicles.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Vehicle not found'
                });
            }
            
            res.json({
                success: true,
                vehicle: vehicles[0]
            });
        } catch (error) {
            console.error('Error fetching vehicle:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    createVehicle: async (req, res) => {
        try {
            const { plate_number, type, model, year } = req.body;
            
            console.log('Create vehicle request body:', req.body);
            
            if (!plate_number || !type || !model || !year) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    required: ['plate_number', 'type', 'model', 'year']
                });
            }

            const [existing] = await db.getDB().execute(
                'SELECT vehicle_id FROM vehicles WHERE plate_number = ?',
                [plate_number]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Vehicle with this plate number already exists'
                });
            }

            const [result] = await db.getDB().execute(
                'INSERT INTO vehicles (plate_number, type, model, year) VALUES (?, ?, ?, ?)',
                [plate_number, type, model, year]
            );

            const [createdVehicle] = await db.getDB().execute(
                'SELECT * FROM vehicles WHERE vehicle_id = ?',
                [result.insertId]
            );
            
            console.log('Vehicle created successfully, ID:', result.insertId);
            
            res.status(201).json({
                success: true,
                message: 'Vehicle created successfully',
                vehicle: createdVehicle[0],
                vehicle_id: result.insertId
            });
        } catch (error) {
            console.error('Error creating vehicle:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    updateVehicle: async (req, res) => {
        try {
            const id = req.params.id;
            const updates = req.body;
            
            console.log(`Updating vehicle ID: ${id} with data:`, updates);

            const [existing] = await db.getDB().execute(
                'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?',
                [id]
            );
            
            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Vehicle not found'
                });
            }
            
            const fields = [];
            const values = [];

            ['plate_number', 'type', 'model', 'year'].forEach(field => {
                if (updates[field] !== undefined) {
                    fields.push(`${field} = ?`);
                    values.push(updates[field]);
                }
            });
            
            if (fields.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No fields to update'
                });
            }
            
            values.push(id); 
            
            await db.getDB().execute(
                `UPDATE vehicles SET ${fields.join(', ')} WHERE vehicle_id = ?`,
                values
            );

            const [updatedVehicle] = await db.getDB().execute(
                'SELECT * FROM vehicles WHERE vehicle_id = ?',
                [id]
            );
            
            console.log('Vehicle updated successfully');
            
            res.json({
                success: true,
                message: 'Vehicle updated successfully',
                vehicle: updatedVehicle[0]
            });
        } catch (error) {
            console.error('Error updating vehicle:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    deleteVehicle: async (req, res) => {
        try {
            const id = req.params.id;
            console.log(`Deleting vehicle ID: ${id}`);
            
            const [existing] = await db.getDB().execute(
                'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?',
                [id]
            );
            
            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Vehicle not found'
                });
            }

            const [drivers] = await db.getDB().execute(
                'SELECT driver_id FROM drivers WHERE vehicle_id = ?',
                [id]
            );
            
            if (drivers.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete vehicle. There are drivers assigned to this vehicle.'
                });
            }
            
            await db.getDB().execute(
                'DELETE FROM vehicles WHERE vehicle_id = ?',
                [id]
            );
            
            console.log('Vehicle deleted successfully');
            
            res.json({
                success: true,
                message: 'Vehicle deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    getVehicleRouteHistory: async (req, res) => {
        try {
            const id = req.params.id;
            console.log(`Getting route history for vehicle ID: ${id}`);
            
            const [routes] = await db.getDB().execute(`
                SELECT r.*, 
                       DATE_FORMAT(r.planned_start, '%Y-%m-%d %H:%i') as formatted_start,
                       DATE_FORMAT(r.planned_end, '%Y-%m-%d %H:%i') as formatted_end
                FROM routes r
                WHERE r.vehicle_id = ?
                ORDER BY r.planned_start DESC
                LIMIT 50
            `, [id]);

            const [stats] = await db.getDB().execute(`
                SELECT 
                    COUNT(*) as total_routes,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_routes,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_routes,
                    COUNT(CASE WHEN status = 'planned' THEN 1 END) as planned_routes
                FROM routes
                WHERE vehicle_id = ?
            `, [id]);
            
            console.log(`Found ${routes.length} routes for vehicle ${id}`);
            
            res.json({
                success: true,
                routes: routes,
                stats: stats[0],
                count: routes.length
            });
        } catch (error) {
            console.error('Error fetching vehicle route history:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    getVehicleFuelStats: async (req, res) => {
        try {
            const id = req.params.id;
            console.log(`Getting fuel stats for vehicle ID: ${id}`);
            
            const mockStats = {
                vehicle_id: parseInt(id),
                avg_fuel_consumption: 12.5,
                total_fuel_used: 1250.50,
                last_refuel_amount: 60.0,
                last_refuel_date: '2024-01-10',
                fuel_efficiency: '8.5 км/л'
            };
            
            res.json({
                success: true,
                fuel_stats: mockStats,
                message: 'Fuel statistics (mock data)'
            });
        } catch (error) {
            console.error('Error fetching vehicle fuel stats:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    findVehicleByPlate: async (req, res) => {
        try {
            const plate_number = req.params.plate_number;
            console.log(`Finding vehicle by plate: ${plate_number}`);
            
            const [vehicles] = await db.getDB().execute(`
                SELECT v.*, d.name as driver_name, d.driver_id, d.contact
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                WHERE v.plate_number = ?
            `, [plate_number]);
            
            if (vehicles.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Vehicle not found'
                });
            }
            
            res.json({
                success: true,
                vehicle: vehicles[0]
            });
        } catch (error) {
            console.error('Error finding vehicle by plate:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    assignDriver: async (req, res) => {
        try {
            const { vehicle_id, driver_id } = req.body;
            
            console.log(`Assigning driver ${driver_id} to vehicle ${vehicle_id}`);
            
            if (!vehicle_id || !driver_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    required: ['vehicle_id', 'driver_id']
                });
            }

            const [vehicles] = await db.getDB().execute(
                'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?',
                [vehicle_id]
            );
            
            if (vehicles.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Vehicle not found'
                });
            }

            const [drivers] = await db.getDB().execute(
                'SELECT driver_id FROM drivers WHERE driver_id = ?',
                [driver_id]
            );
            
            if (drivers.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Driver not found'
                });
            }

            await db.getDB().execute(
                'UPDATE drivers SET vehicle_id = ? WHERE driver_id = ?',
                [vehicle_id, driver_id]
            );
            
            console.log(`Driver ${driver_id} assigned to vehicle ${vehicle_id} successfully`);
            
            res.json({
                success: true,
                message: 'Driver assigned to vehicle successfully'
            });
        } catch (error) {
            console.error('Error assigning driver:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    },

    unassignDriver: async (req, res) => {
        try {
            const { driver_id } = req.body;
            
            console.log(`Unassigning driver ${driver_id}`);
            
            if (!driver_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Driver ID is required'
                });
            }

            const [drivers] = await db.getDB().execute(
                'SELECT driver_id FROM drivers WHERE driver_id = ?',
                [driver_id]
            );
            
            if (drivers.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Driver not found'
                });
            }

            await db.getDB().execute(
                'UPDATE drivers SET vehicle_id = NULL WHERE driver_id = ?',
                [driver_id]
            );
            
            console.log(`Driver ${driver_id} unassigned successfully`);
            
            res.json({
                success: true,
                message: 'Driver unassigned successfully'
            });
        } catch (error) {
            console.error('Error unassigning driver:', error);
            res.status(500).json({
                success: false,
                error: 'Database error',
                message: error.message
            });
        }
    }
};

module.exports = vehicleController;