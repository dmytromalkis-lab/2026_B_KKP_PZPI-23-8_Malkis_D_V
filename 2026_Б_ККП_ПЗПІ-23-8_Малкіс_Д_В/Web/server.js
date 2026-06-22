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
            telemetryRoutes = require('./src/route/telemetryRoutes');
            vehicleRoutes = require('./src/route/vehicleRoutes');
            authRoutes = require('./src/route/authRoutes');
            driverRoutes = require('./src/route/driverRoutes');
            routeRoutes = require('./src/route/routeRoutes');
            reportRoutes = require('./src/route/reportRoutes');
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
                    SELECT
                        r.route_id,
                        r.vehicle_id,
                        r.start_point,
                        r.end_point,
                        r.planned_start,
                        r.planned_end,
                        r.status,
                        v.plate_number,
                        v.model
                    FROM routes r
                    LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
                    ORDER BY r.planned_start DESC
                `);
        
                console.log(`✅ Отримано ${routes.length} маршрутів`);
                routes.forEach(route => {
                    console.log(`   Маршрут #${route.route_id}: vehicle_id=${route.vehicle_id}, plate=${route.plate_number || 'NULL'}`);
                });
        
                res.json({
                    success: true,
                    data: routes
                });
        
            } catch (error) {
                console.error('❌ Помилка отримання маршрутів:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });

        app.get('/api/routes/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const db = getDB();

                const [routes] = await db.execute(`
                    SELECT
                        r.route_id,
                        r.vehicle_id,
                        r.start_point,
                        r.end_point,
                        r.planned_start,
                        r.planned_end,
                        r.status,
                        v.plate_number,
                        v.model
                    FROM routes r
                    LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
                    WHERE r.route_id = ?
                `, [id]);

                if (routes.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Маршрут не знайдено'
                    });
                }

                console.log(`✅ Отримано маршрут #${id}: vehicle_id=${routes[0].vehicle_id}`);

                res.json({
                    success: true,
                    data: routes[0]
                });

            } catch (error) {
                console.error('❌ Помилка отримання маршруту:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });

        app.post('/api/routes', async (req, res) => {
            try {
                const {
                    vehicle_id,
                    start_point,
                    end_point,
                    planned_start,
                    planned_end,
                    status
                } = req.body;

                console.log('📝 Отримано запит на створення маршруту:');
                console.log('   vehicle_id:', vehicle_id, 'тип:', typeof vehicle_id);
                console.log('   start_point:', start_point);
                console.log('   end_point:', end_point);
                console.log('   planned_start:', planned_start);
                console.log('   planned_end:', planned_end);
                console.log('   status:', status);

                // Перевірка обов'язкових полів
                if (!start_point || !end_point || !planned_start || !planned_end) {
                    return res.status(400).json({
                        success: false,
                        error: 'Заповніть всі обов\'язкові поля (start_point, end_point, planned_start, planned_end)'
                    });
                }

                let vehicleIdValue = null;
                if (vehicle_id !== undefined && vehicle_id !== null && vehicle_id !== '') {
                    vehicleIdValue = parseInt(vehicle_id);
                    if (isNaN(vehicleIdValue)) {
                        return res.status(400).json({
                            success: false,
                            error: 'vehicle_id має бути числом'
                        });
                    }

                    const db = getDB();
                    const [vehicleCheck] = await db.execute(
                        'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?',
                        [vehicleIdValue]
                    );
                    
                    if (vehicleCheck.length === 0) {
                        return res.status(400).json({
                            success: false,
                            error: `Транспортний засіб з ID ${vehicleIdValue} не знайдено`
                        });
                    }
                    console.log(`   ✅ Транспортний засіб з ID ${vehicleIdValue} знайдено`);
                }

                const db = getDB();

                const [result] = await db.execute(
                    `
                    INSERT INTO routes
                    (
                        vehicle_id,
                        planned_start,
                        planned_end,
                        start_point,
                        end_point,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        vehicleIdValue,
                        planned_start,
                        planned_end,
                        start_point,
                        end_point,
                        status || 'planned'
                    ]
                );

                console.log(`✅ Маршрут створено з ID: ${result.insertId}, vehicle_id: ${vehicleIdValue}`);

                const [newRoute] = await db.execute(`
                    SELECT
                        r.route_id,
                        r.vehicle_id,
                        r.start_point,
                        r.end_point,
                        r.planned_start,
                        r.planned_end,
                        r.status,
                        v.plate_number,
                        v.model
                    FROM routes r
                    LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
                    WHERE r.route_id = ?
                `, [result.insertId]);

                res.status(201).json({
                    success: true,
                    message: 'Маршрут створено',
                    route_id: result.insertId,
                    data: newRoute[0]
                });

            } catch (error) {
                console.error('❌ Помилка створення маршруту:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });

        app.delete('/api/routes/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const db = getDB();

                const [existing] = await db.execute(
                    'SELECT * FROM routes WHERE route_id = ?',
                    [id]
                );

                if (existing.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Маршрут не знайдено'
                    });
                }

                await db.execute(
                    'DELETE FROM routes WHERE route_id = ?',
                    [id]
                );

                console.log(`✅ Маршрут #${id} видалено`);

                res.json({
                    success: true,
                    message: 'Маршрут успішно видалено'
                });

            } catch (error) {
                console.error('❌ Помилка видалення маршруту:', error);
                res.status(500).json({
                    success: false,
                    error: 'Database error',
                    message: error.message
                });
            }
        });

        const fs = require('fs');
        const fontPaths = [
            path.join(__dirname, 'fonts/DejaVuSans.ttf'),
            path.join(__dirname, '../fonts/DejaVuSans.ttf'),
            'C:/Windows/Fonts/arial.ttf',
            'C:/Windows/Fonts/times.ttf',
            '/System/Library/Fonts/Helvetica.ttc',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
        ];

        let availableFont = null;
        for (const fontPath of fontPaths) {
            try {
                if (fs.existsSync(fontPath)) {
                    availableFont = fontPath;
                    console.log('✅ Знайдено шрифт для PDF:', fontPath);
                    break;
                }
            } catch (e) {}
        }

        if (!availableFont) {
            console.warn('⚠️ Шрифт для кирилиці не знайдено! Українська мова може відображатись неправильно.');
        }

        console.log('📊 Створення прямих маршрутів для звітів...');
        const PDFDocument = require('pdfkit');

        // Звіт по водіях
        app.get('/api/reports/drivers', async (req, res) => {
            try {
                console.log('📄 Generating drivers PDF...');
                const db = getDB();
                const { status } = req.query;
                
                let query = `
                    SELECT d.*, v.plate_number 
                    FROM drivers d
                    LEFT JOIN vehicles v ON d.vehicle_id = v.vehicle_id
                `;
                let params = [];
                
                if (status) {
                    query += ` WHERE d.status = ?`;
                    params.push(status);
                }
                
                query += ` ORDER BY d.name`;
                
                const [drivers] = await db.execute(query, params);
                console.log(`✅ Found ${drivers.length} drivers`);

                const doc = new PDFDocument({ margin: 50 });
                
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="drivers.pdf"`);
                doc.pipe(res);

                if (availableFont) {
                    try {
                        doc.registerFont('MainFont', availableFont);
                        doc.font('MainFont');
                    } catch (e) {
                        console.warn('⚠️ Не вдалося зареєструвати шрифт:', e.message);
                    }
                }

                doc.fontSize(20).text('ЗВІТ ПО ВОДІЯХ', { align: 'center' });
                doc.moveDown();
                doc.fontSize(12).text(`Дата: ${new Date().toLocaleString('uk-UA')}`, { align: 'center' });
                if (status) {
                    const statusMap = { 'active': 'Активні', 'inactive': 'Неактивні', 'vacation': 'У відпустці' };
                    doc.text(`Статус: ${statusMap[status] || status}`, { align: 'center' });
                }
                doc.text(`Всього водіїв: ${drivers.length}`, { align: 'center' });
                doc.moveDown();

                if (drivers.length === 0) {
                    doc.text('Немає даних для відображення', { align: 'center' });
                    doc.end();
                    return;
                }

                let y = doc.y;
                doc.fontSize(10);
                doc.text('№', 50, y);
                doc.text('ПІБ', 80, y);
                doc.text('Контакт', 220, y);
                doc.text('Транспорт', 350, y);
                doc.text('Статус', 450, y);
                y += 20;
                doc.moveTo(50, y).lineTo(550, y).stroke();
                y += 10;

                drivers.forEach((driver, i) => {
                    if (y > 700) { doc.addPage(); y = 50; }
                    doc.text((i + 1).toString(), 50, y);
                    doc.text((driver.name || '—').substring(0, 25), 80, y);
                    doc.text((driver.contact || '—').substring(0, 20), 220, y);
                    doc.text((driver.plate_number || '—').substring(0, 15), 350, y);
                    const statusMap = { 'active': 'Активний', 'inactive': 'Неактивний', 'vacation': 'Відпустка' };
                    doc.text(statusMap[driver.status] || driver.status || '—', 450, y);
                    y += 20;
                });

                doc.end();
                console.log('✅ Drivers PDF generated successfully');
            } catch (error) {
                console.error('❌ Error generating drivers PDF:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Помилка генерації PDF: ' + error.message });
                }
            }
        });

        app.get('/api/reports/vehicles', async (req, res) => {
            try {
                console.log('📄 Generating vehicles PDF...');
                const db = getDB();
                const { year } = req.query;
                
                let query = `
                    SELECT v.*, d.name as driver_name
                    FROM vehicles v
                    LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
                `;
                let params = [];
                
                if (year) {
                    query += ` WHERE v.year = ?`;
                    params.push(year);
                }
                
                query += ` ORDER BY v.plate_number`;
                
                const [vehicles] = await db.execute(query, params);
                console.log(`✅ Found ${vehicles.length} vehicles`);

                const doc = new PDFDocument({ margin: 50 });
                
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="vehicles.pdf"`);
                doc.pipe(res);

                if (availableFont) {
                    try {
                        doc.registerFont('MainFont', availableFont);
                        doc.font('MainFont');
                    } catch (e) {}
                }

                doc.fontSize(20).text('ЗВІТ ПО ТРАНСПОРТНИХ ЗАСОБАХ', { align: 'center' });
                doc.moveDown();
                doc.fontSize(12).text(`Дата: ${new Date().toLocaleString('uk-UA')}`, { align: 'center' });
                if (year) doc.text(`Рік випуску: ${year}`, { align: 'center' });
                doc.text(`Всього транспорту: ${vehicles.length}`, { align: 'center' });
                doc.moveDown();

                if (vehicles.length === 0) {
                    doc.text('Немає даних для відображення', { align: 'center' });
                    doc.end();
                    return;
                }

                let y = doc.y;
                doc.fontSize(10);
                doc.text('№', 50, y);
                doc.text('Номер', 80, y);
                doc.text('Модель', 180, y);
                doc.text('Тип', 280, y);
                doc.text('Рік', 340, y);
                doc.text('Водій', 400, y);
                y += 20;
                doc.moveTo(50, y).lineTo(550, y).stroke();
                y += 10;

                vehicles.forEach((vehicle, i) => {
                    if (y > 700) { doc.addPage(); y = 50; }
                    doc.text((i + 1).toString(), 50, y);
                    doc.text((vehicle.plate_number || '—').substring(0, 10), 80, y);
                    doc.text((vehicle.model || '—').substring(0, 20), 180, y);
                    doc.text((vehicle.type || '—').substring(0, 15), 280, y);
                    doc.text(vehicle.year ? vehicle.year.toString() : '—', 340, y);
                    doc.text((vehicle.driver_name || '—').substring(0, 20), 400, y);
                    y += 20;
                });

                doc.end();
                console.log('✅ Vehicles PDF generated successfully');
            } catch (error) {
                console.error('❌ Error generating vehicles PDF:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Помилка генерації PDF: ' + error.message });
                }
            }
        });

        app.get('/api/reports/routes', async (req, res) => {
            try {
                console.log('📄 Generating routes PDF...');
                const db = getDB();
                const { startDate, endDate, status, limit = 100 } = req.query;
                
                let query = `
                    SELECT r.*, v.plate_number
                    FROM routes r
                    LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
                    WHERE 1=1
                `;
                let params = [];
                
                if (status) {
                    query += ` AND r.status = ?`;
                    params.push(status);
                }
                
                if (startDate) {
                    query += ` AND DATE(r.planned_start) >= ?`;
                    params.push(startDate);
                }
                
                if (endDate) {
                    query += ` AND DATE(r.planned_start) <= ?`;
                    params.push(endDate);
                }
                
                query += ` ORDER BY r.planned_start DESC LIMIT ?`;
                params.push(parseInt(limit));
                
                const [routes] = await db.execute(query, params);
                console.log(`✅ Found ${routes.length} routes`);

                const doc = new PDFDocument({ margin: 50 });
                
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="routes.pdf"`);
                doc.pipe(res);

                if (availableFont) {
                    try {
                        doc.registerFont('MainFont', availableFont);
                        doc.font('MainFont');
                    } catch (e) {}
                }

                doc.fontSize(20).text('ЗВІТ ПО МАРШРУТАХ', { align: 'center' });
                doc.moveDown();
                doc.fontSize(12).text(`Дата: ${new Date().toLocaleString('uk-UA')}`, { align: 'center' });
                if (startDate) doc.text(`Від: ${startDate}`, { align: 'center' });
                if (endDate) doc.text(`До: ${endDate}`, { align: 'center' });
                if (status) {
                    const statusMap = { 'planned': 'Заплановані', 'active': 'Активні', 'completed': 'Завершені', 'cancelled': 'Скасовані' };
                    doc.text(`Статус: ${statusMap[status] || status}`, { align: 'center' });
                }
                doc.text(`Всього маршрутів: ${routes.length}`, { align: 'center' });
                doc.moveDown();

                if (routes.length === 0) {
                    doc.text('Немає даних для відображення', { align: 'center' });
                    doc.end();
                    return;
                }

                let y = doc.y;
                doc.fontSize(9);
                doc.text('№', 50, y);
                doc.text('ТЗ', 80, y);
                doc.text('Звідки', 130, y);
                doc.text('Куди', 250, y);
                doc.text('Дата', 370, y);
                doc.text('Статус', 450, y);
                y += 20;
                doc.moveTo(50, y).lineTo(550, y).stroke();
                y += 10;

                routes.forEach((route, i) => {
                    if (y > 700) { doc.addPage(); y = 50; }
                    doc.text((i + 1).toString(), 50, y);
                    doc.text((route.plate_number || '—').substring(0, 8), 80, y);
                    doc.text((route.start_point || '—').substring(0, 20), 130, y);
                    doc.text((route.end_point || '—').substring(0, 20), 250, y);
                    const date = route.planned_start ? new Date(route.planned_start).toLocaleDateString('uk-UA') : '—';
                    doc.text(date, 370, y);
                    const statusMap = { 'planned': 'Заплан.', 'active': 'Активн.', 'completed': 'Заверш.', 'cancelled': 'Скас.' };
                    doc.text(statusMap[route.status] || route.status || '—', 450, y);
                    y += 20;
                });

                doc.end();
                console.log('✅ Routes PDF generated successfully');
            } catch (error) {
                console.error('❌ Error generating routes PDF:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Помилка генерації PDF: ' + error.message });
                }
            }
        });

        console.log('✅ Direct report routes created successfully');

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
            console.log("📡 ESP32 telemetry received:", req.body);
          
            const {
                vehicle_id,
                latitude,
                longitude,
                fuel_level,
                speed,
            } = req.body;
          
            if (!vehicle_id || latitude === undefined || longitude === undefined) {
                return res.status(400).json({ 
                    error: 'Missing required fields: vehicle_id, latitude, longitude' 
                });
            }
          
            try {
                const db = getDB();
                const [result] = await db.execute(
                    `INSERT INTO telemetry_records 
                     (vehicle_id, latitude, longitude, fuel_level, speed) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [vehicle_id, latitude, longitude, fuel_level || 0, speed || 0]
                );
                
                console.log(`✅ Telemetry saved, record_id: ${result.insertId}`);
                res.json({ 
                    ok: true, 
                    record_id: result.insertId,
                    message: 'Telemetry data saved successfully' 
                });
                
            } catch (error) {
                console.error('❌ Error saving telemetry:', error);
                res.status(500).json({ 
                    error: 'Database error: ' + error.message 
                });
            }
        });

        // ============ 404 HANDLER ============
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
                            <li><a href="/route.html">Маршрути</a></li>
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

        // ============ ERROR HANDLER ============
        app.use((err, req, res, next) => {
            console.error('❌ Server error:', err.message);
            console.error(err.stack);
            
            res.status(500).json({
                error: 'Internal server error',
                message: err.message,
                timestamp: new Date().toISOString()
            });
        });

        // ============ START SERVER ============
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
            console.log(`   👨‍✈️ Drivers:      http://localhost:${PORT}/drivers.html`);
            console.log(`   🗺️ Routes:         http://localhost:${PORT}/route.html`);
            console.log(`   📈 Reports:        http://localhost:${PORT}/reports.html`);
            console.log(`   📡 Telemetry:      http://localhost:${PORT}/telemetry.html`);
            console.log(`\n📁 Static files served from: ${frontendPath}\n`);
            console.log(`📊 REPORT ROUTES (ПРЯМЕ ПІДКЛЮЧЕННЯ):`);
            console.log(`   👨‍✈️ Drivers:  GET http://localhost:${PORT}/api/reports/drivers`);
            console.log(`   🚗 Vehicles: GET http://localhost:${PORT}/api/reports/vehicles`);
            console.log(`   🗺️ Routes:   GET http://localhost:${PORT}/api/reports/routes`);
            console.log(`   ℹ️  Можна додати фільтри: ?status=active&year=2020`);
            console.log(`   ℹ️  Для маршрутів: ?status=planned&startDate=2024-01-01&endDate=2024-12-31\n`);
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
    router.get('/list', async (req, res) => {
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
    router.post('/register', async (req, res) => {
        res.json({ message: 'Auth routes' });
    });
    router.get('/me', async (req, res) => {
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
    router.get('/drivers', async (req, res) => {
        res.status(501).json({ error: 'Report generation not available' });
    });
    router.get('/vehicles', async (req, res) => {
        res.status(501).json({ error: 'Report generation not available' });
    });
    router.get('/routes', async (req, res) => {
        res.status(501).json({ error: 'Report generation not available' });
    });
    return router;
}

startServer();
