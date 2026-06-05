require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, getDB } = require('./src/config/database');

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
const PORT = process.env.PORT || 4001;

async function startServer() {
    try {
        await connectDB();
        console.log('✅ Connected to database');

        let telemetryRoutes, vehicleRoutes, authRoutes, driverRoutes, routeRoutes, reportRoutes;

        try {
            telemetryRoutes = require('./src/routes/telemetryRoutes');
            vehicleRoutes = require('./src/routes/vehicleRoutes');
            authRoutes = require('./src/routes/authRoutes');
            driverRoutes = require('./src/routes/driverRoutes');
            routeRoutes = require('./src/routes/routeRoutes');
            reportRoutes = require('./src/routes/reportRoutes');
            console.log('✅ All routes loaded successfully');
        } catch (err) {
            console.error('❌ Error loading routes:', err.message);
            
            if (err.message.includes('vehicleRoutes')) {
                console.log('⚠️ Creating basic vehicle routes...');
                vehicleRoutes = createBasicVehicleRoutes();
            }
            
            if (!telemetryRoutes) {
                console.log('⚠️ Creating basic telemetry routes...');
                telemetryRoutes = createBasicTelemetryRoutes();
            }
            
            if (!authRoutes) {
                console.log('⚠️ Creating basic auth routes...');
                authRoutes = createBasicAuthRoutes();
            }
            
            if (!driverRoutes) {
                console.log('⚠️ Creating basic driver routes...');
                driverRoutes = createBasicDriverRoutes();
            }
            
            if (!routeRoutes) {
                console.log('⚠️ Creating basic route routes...');
                routeRoutes = createBasicRouteRoutes();
            }
            
            if (!reportRoutes) {
                console.log('⚠️ Creating basic report routes...');
                reportRoutes = createBasicReportRoutes();
            }
        }

        const app = express();
        
        app.use((req, res, next) => {
            if (req.url.endsWith('.html')) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
            }
            next();
        });
        
        app.use((req, res, next) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            next();
        });
        
        app.use((req, res, next) => {
            req.lang = req.headers['accept-language'] && req.headers['accept-language'].includes('en') ? 'en' : 'ua';
            next();
        });
        
        const corsOrigin = process.env.CORS_ORIGIN || '*';
        app.use(cors({
            origin: corsOrigin,
            credentials: true
        }));
        
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        
        const frontendPath = path.join(__dirname, 'frontend');
        console.log(`📁 Serving static files from: ${frontendPath}`);
        app.use(express.static(frontendPath));
        
        app.use((req, res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
            next();
        });

        app.post('/api/auth/register', async (req, res) => {
            try {
                const { email, password, name } = req.body;
                console.log('📝 Register attempt:', { email, name });
                
                if (!email || !password || !name) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Всі поля обов\'язкові' 
                    });
                }
                
                const db = getDB();
                
                const [existing] = await db.execute(
                    'SELECT * FROM users WHERE Email = ?',
                    [email]
                );
                
                if (existing.length > 0) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Email вже зареєстрований' 
                    });
                }
                
                const [result] = await db.execute(
                    'INSERT INTO users (Email, Password, Name) VALUES (?, ?, ?)',
                    [email, password, name]
                );
                
                console.log('✅ User registered, ID:', result.insertId);
                
                res.status(201).json({
                    success: true,
                    message: 'Реєстрація успішна',
                    user: {
                        id: result.insertId,
                        email: email,
                        name: name
                    }
                });
                
            } catch (error) {
                console.error('❌ Registration error:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Помилка сервера: ' + error.message 
                });
            }
        });
        
        app.post('/api/auth/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                console.log('🔐 Login attempt for email:', email);
                
                if (!email || !password) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Email та пароль обов\'язкові' 
                    });
                }
                
                const db = getDB();
                
                const [users] = await db.execute(
                    'SELECT * FROM users WHERE Email = ?',
                    [email]
                );
                
                if (users.length === 0) {
                    console.log('❌ User not found');
                    return res.status(401).json({ 
                        success: false, 
                        error: 'Невірний email або пароль' 
                    });
                }
                
                const user = users[0];
                console.log('✅ User found:', user.Email);
                console.log('Password in DB:', user.Password);
                console.log('Password entered:', password);
                
                if (user.Password !== password) {
                    console.log('❌ Password mismatch');
                    return res.status(401).json({ 
                        success: false, 
                        error: 'Невірний email або пароль' 
                    });
                }
                
                console.log('✅ Login successful');
                
                res.json({
                    success: true,
                    message: 'Вхід успішний',
                    user: {
                        id: user.Id,
                        email: user.Email,
                        name: user.Name
                    }
                });
                
            } catch (error) {
                console.error('❌ Login error:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Помилка сервера: ' + error.message 
                });
            }
        });
        
        app.get('/api/auth/me', async (req, res) => {
            try {
                const userId = req.headers['user-id'];
                
                if (!userId) {
                    return res.status(401).json({ 
                        success: false, 
                        error: 'Не авторизовано' 
                    });
                }
                
                const db = getDB();
                const [users] = await db.execute(
                    'SELECT Id, Email, Name FROM users WHERE Id = ?',
                    [userId]
                );
                
                if (users.length === 0) {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Користувача не знайдено' 
                    });
                }
                
                res.json({
                    success: true,
                    user: {
                        id: users[0].Id,
                        email: users[0].Email,
                        name: users[0].Name
                    }
                });
                
            } catch (error) {
                console.error('❌ Profile error:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Помилка сервера' 
                });
            }
        });

        app.get('/api/drivers', async (req, res) => {
            try {
                console.log('🔄 Fetching drivers from database...');
                const db = getDB();
                const [drivers] = await db.execute(`
                    SELECT d.*, v.plate_number as vehicle_plate 
                    FROM drivers d
                    LEFT JOIN vehicles v ON d.vehicle_id = v.vehicle_id
                    ORDER BY d.driver_id DESC
                `);
                
                console.log(`✅ Found ${drivers.length} drivers`);
                
                res.json({
                    success: true,
                    data: drivers,
                    count: drivers.length
                });
            } catch (error) {
                console.error('Error fetching drivers:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });
        
        app.get('/api/drivers/:id', async (req, res) => {
            try {
                const db = getDB();
                const [drivers] = await db.execute(
                    'SELECT * FROM drivers WHERE driver_id = ?',
                    [req.params.id]
                );
                
                if (drivers.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Driver not found'
                    });
                }
                
                res.json({
                    success: true,
                    data: drivers[0]
                });
            } catch (error) {
                console.error('Error fetching driver:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });
        
        app.post('/api/drivers', async (req, res) => {
            try {
                const { name, contact, license_number, status, vehicle_id } = req.body;
                
                if (!name || !contact || !license_number || !status) {
                    return res.status(400).json({
                        success: false,
                        error: 'Missing required fields'
                    });
                }
                
                const db = getDB();
                
                const [existing] = await db.execute(
                    'SELECT * FROM drivers WHERE license_number = ?',
                    [license_number]
                );
                
                if (existing.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Водій з таким посвідченням вже існує'
                    });
                }
                
                let query = 'INSERT INTO drivers (name, contact, license_number, status) VALUES (?, ?, ?, ?)';
                let params = [name, contact, license_number, status];
                
                if (vehicle_id) {
                    query = 'INSERT INTO drivers (name, contact, license_number, status, vehicle_id) VALUES (?, ?, ?, ?, ?)';
                    params = [name, contact, license_number, status, vehicle_id];
                }
                
                const [result] = await db.execute(query, params);
                
                res.status(201).json({
                    success: true,
                    message: 'Driver created successfully',
                    driver_id: result.insertId
                });
            } catch (error) {
                console.error('Error creating driver:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });
        
        app.put('/api/drivers/:id', async (req, res) => {
            try {
                const { name, contact, license_number, status, vehicle_id } = req.body;
                const id = req.params.id;
                
                const db = getDB();
                await db.execute(
                    'UPDATE drivers SET name = ?, contact = ?, license_number = ?, status = ?, vehicle_id = ? WHERE driver_id = ?',
                    [name, contact, license_number, status, vehicle_id || null, id]
                );
                
                res.json({
                    success: true,
                    message: 'Driver updated successfully'
                });
            } catch (error) {
                console.error('Error updating driver:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });
        
        app.delete('/api/drivers/:id', async (req, res) => {
            try {
                const db = getDB();
                await db.execute(
                    'DELETE FROM drivers WHERE driver_id = ?',
                    [req.params.id]
                );
                
                res.json({
                    success: true,
                    message: 'Driver deleted successfully'
                });
            } catch (error) {
                console.error('Error deleting driver:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });

        app.get('/api/vehicles', async (req, res) => {
            try {
                console.log('🔄 Fetching vehicles from database...');
                const db = getDB();
                const [vehicles] = await db.execute(`
                    SELECT v.*, 
                           d.driver_id, 
                           d.name as driver_name, 
                           d.contact as driver_contact,
                           d.license_number as driver_license,
                           d.status as driver_status
                    FROM vehicles v
                    LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                    ORDER BY v.vehicle_id DESC
                `);
                
                console.log(`✅ Found ${vehicles.length} vehicles with driver info`);
                
                res.json({
                    success: true,
                    data: vehicles,
                    count: vehicles.length
                });
            } catch (error) {
                console.error('Error fetching vehicles:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });
        
        app.get('/api/vehicles/:id', async (req, res) => {
            try {
                const db = getDB();
                const [vehicles] = await db.execute(`
                    SELECT v.*, 
                           d.driver_id, 
                           d.name as driver_name, 
                           d.contact as driver_contact,
                           d.license_number as driver_license,
                           d.status as driver_status
                    FROM vehicles v
                    LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                    WHERE v.vehicle_id = ?
                `, [req.params.id]);
                
                if (vehicles.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Vehicle not found'
                    });
                }
                
                res.json({
                    success: true,
                    data: vehicles[0]
                });
            } catch (error) {
                console.error('Error fetching vehicle:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });
        
        app.post('/api/vehicles', async (req, res) => {
            try {
                let { plate_number, type, model, year } = req.body;
                
                if (!plate_number || !type || !model || !year) {
                    return res.status(400).json({
                        success: false,
                        error: 'Missing required fields'
                    });
                }
                
                plate_number = plate_number.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                
                const db = getDB();
                const [result] = await db.execute(
                    'INSERT INTO vehicles (plate_number, type, model, year) VALUES (?, ?, ?, ?)',
                    [plate_number, type, model, year]
                );
                
                res.status(201).json({
                    success: true,
                    message: 'Vehicle created successfully',
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
        });
        
        app.put('/api/vehicles/:id', async (req, res) => {
            try {
                let { plate_number, type, model, year } = req.body;
                const id = req.params.id;
                
                plate_number = plate_number.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                
                const db = getDB();
                await db.execute(
                    'UPDATE vehicles SET plate_number = ?, type = ?, model = ?, year = ? WHERE vehicle_id = ?',
                    [plate_number, type, model, year, id]
                );
                
                res.json({
                    success: true,
                    message: 'Vehicle updated successfully'
                });
            } catch (error) {
                console.error('Error updating vehicle:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });
        
        app.delete('/api/vehicles/:id', async (req, res) => {
            try {
                const db = getDB();
                await db.execute(
                    'DELETE FROM vehicles WHERE vehicle_id = ?',
                    [req.params.id]
                );
                
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
        });
        
        app.post('/api/vehicles/assign-driver', async (req, res) => {
            try {
                const { vehicle_id, driver_id } = req.body;
                
                const db = getDB();
                
                await db.execute(
                    'UPDATE drivers SET vehicle_id = NULL WHERE vehicle_id = ?',
                    [vehicle_id]
                );
                
                await db.execute(
                    'UPDATE drivers SET vehicle_id = ? WHERE driver_id = ?',
                    [vehicle_id, driver_id]
                );
                
                res.json({
                    success: true,
                    message: 'Driver assigned successfully'
                });
            } catch (error) {
                console.error('Error assigning driver:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });
        
        app.post('/api/vehicles/unassign-driver', async (req, res) => {
            try {
                const { driver_id } = req.body;
                
                const db = getDB();
                await db.execute(
                    'UPDATE drivers SET vehicle_id = NULL WHERE driver_id = ?',
                    [driver_id]
                );
                
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
        });

        app.get('/api/routes', async (req, res) => {
            try {
                const db = getDB();
                const [routes] = await db.execute(`
                    SELECT r.*, v.plate_number 
                    FROM routes r
                    LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
                    ORDER BY r.planned_start DESC
                `);
                
                res.json({
                    success: true,
                    data: routes
                });
            } catch (error) {
                console.error('Error fetching routes:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });

        app.get('/api/reports/drivers/pdf', async (req, res) => {
            res.json({ message: 'Report routes - implementation', success: true });
        });
        
        app.get('/api/reports/vehicles/pdf', async (req, res) => {
            res.json({ message: 'Report routes - implementation', success: true });
        });
        
        app.get('/api/reports/routes/pdf', async (req, res) => {
            res.json({ message: 'Report routes - implementation', success: true });
        });

        app.get('/api/vehicles/list', async (req, res) => {
            try {
                const db = getDB();
                const [vehicles] = await db.execute(`
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
                    error: 'Database error',
                    message: error.message
                });
            }
        });

        app.get('/', (req, res) => {
            res.sendFile(path.join(frontendPath, 'index.html'));
        });

        app.get('/route.html', (req, res) => {
            res.sendFile(path.join(frontendPath, 'route.html'));
        });

        app.get('/routes.html', (req, res) => {
            res.sendFile(path.join(frontendPath, 'routes.html'));
        });

        const pages = ['dashboard', 'vehicles', 'drivers', 'telemetry', 'reports', 'login', 'register'];
        pages.forEach(page => {
            app.get(`/${page}.html`, (req, res) => {
                const filePath = path.join(frontendPath, `${page}.html`);
                console.log(`Serving ${page}.html from:`, filePath);
                res.sendFile(filePath);
            });
        });

        app.get('/api/health', (req, res) => {
            res.json({
                status: 'OK',
                database: 'connected',
                timestamp: new Date().toISOString(),
                server: 'Fleet Management API',
                version: '1.0.0'
            });
        });

        app.get('/api/mapbox-token', (req, res) => {
            if (!MAPBOX_TOKEN) {
                return res.status(500).json({ error: 'Mapbox token not configured' });
            }
            res.json({ token: MAPBOX_TOKEN });
        });

        app.get('/api/test', (req, res) => {
            res.json({
                message: 'API is working!',
                status: 'active',
                time: new Date().toISOString()
            });
        });

        app.post('/api/telemetry/stream', async (req, res) => {
            console.log("ESP32:", req.body);
          
            const {
              telemetry_id,
              vehicle_id,
              latitude,
              longitude,
              fuel_level,
              speed,
            } = req.body;
          
            try {
                const db = getDB();
                await db.execute(
                    `INSERT INTO telemetry_records 
                     (telemetry_id, vehicle_id, latitude, longitude, fuel_level, speed) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [telemetry_id, vehicle_id, latitude, longitude, fuel_level, speed]
                );
                res.json({ ok: true });
            } catch (error) {
                console.error('Error saving telemetry:', error);
                res.status(500).json({ error: error.message });
            }
        });

        app.use((req, res) => {
            if (req.accepts('html')) {
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>404 - Сторінку не знайдено</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            h1 { color: #dc3545; }
                            a { color: #007bff; text-decoration: none; }
                        </style>
                    </head>
                    <body>
                        <h1>404 - Сторінку не знайдено</h1>
                        <p>Запитана сторінка <strong>${req.url}</strong> не існує.</p>
                        <p>Доступні сторінки:</p>
                        <ul style="list-style: none; padding: 0;">
                            <li><a href="/dashboard.html">Головна</a></li>
                            <li><a href="/vehicles.html">Транспорт</a></li>
                            <li><a href="/drivers.html">Водії</a></li>
                            <li><a href="/routes.html">Маршрути</a></li>
                            <li><a href="/telemetry.html">Телеметрія</a></li>
                            <li><a href="/reports.html">Звіти</a></li>
                            <li><a href="/login.html">Вхід</a></li>
                            <li><a href="/register.html">Реєстрація</a></li>
                        </ul>
                    </body>
                    </html>
                `);
            }
            
            res.status(404).json({
                error: 'Route not found',
                method: req.method,
                url: req.originalUrl
            });
        });

        app.use((err, req, res, next) => {
            console.error('❌ Server error:', err.message);
            console.error(err.stack);
            
            res.status(500).json({
                error: 'Internal server error',
                message: err.message,
                timestamp: new Date().toISOString()
            });
        });

        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
            console.log(`🗺️ Mapbox token: http://localhost:${PORT}/api/mapbox-token`);
            console.log(`\n🔐 AUTHENTICATION:`);
            console.log(`   📝 Register: POST http://localhost:${PORT}/api/auth/register`);
            console.log(`   🔑 Login:    POST http://localhost:${PORT}/api/auth/login`);
            console.log(`   👤 Profile:  GET  http://localhost:${PORT}/api/auth/me (з header user-id)`);
            console.log(`\n📄 PAGES:`);
            console.log(`   🔐 Login page:     http://localhost:${PORT}/login.html`);
            console.log(`   📝 Register page:  http://localhost:${PORT}/register.html`);
            console.log(`   📊 Dashboard:      http://localhost:${PORT}/dashboard.html`);
            console.log(`   🚗 Vehicles:       http://localhost:${PORT}/vehicles.html`);
            console.log(`   👨‍✈️ Drivers:        http://localhost:${PORT}/drivers.html`);
            console.log(`   🗺️ Routes:         http://localhost:${PORT}/routes.html`);
            console.log(`   📈 Reports:        http://localhost:${PORT}/reports.html`);
            console.log(`   📡 Telemetry:      http://localhost:${PORT}/telemetry.html`);
            console.log(`\n📁 Static files served from: ${frontendPath}\n`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

function createBasicVehicleRoutes() {
    const router = require('express').Router();
    router.get('/', async (req, res) => {
        res.json({ success: true, data: [] });
    });
    return router;
}

function createBasicTelemetryRoutes() {
    const router = require('express').Router();
    router.get('/', async (req, res) => {
        res.json({ message: 'Telemetry routes' });
    });
    return router;
}

function createBasicAuthRoutes() {
    const router = require('express').Router();
    router.post('/login', async (req, res) => {
        res.json({ message: 'Auth routes' });
    });
    return router;
}

function createBasicDriverRoutes() {
    const router = require('express').Router();
    router.get('/', async (req, res) => {
        res.json({ success: true, data: [] });
    });
    return router;
}

function createBasicRouteRoutes() {
    const router = require('express').Router();
    router.get('/', async (req, res) => {
        res.json({ success: true, data: [] });
    });
    return router;
}

function createBasicReportRoutes() {
    const router = require('express').Router();
    router.get('/drivers/pdf', async (req, res) => {
        res.json({ message: 'Report routes' });
    });
    router.get('/vehicles/pdf', async (req, res) => {
        res.json({ message: 'Report routes' });
    });
    router.get('/routes/pdf', async (req, res) => {
        res.json({ message: 'Report routes' });
    });
    return router;
}

startServer();