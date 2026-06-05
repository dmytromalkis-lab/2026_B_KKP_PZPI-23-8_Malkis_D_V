const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { generateToken } = require('../utils/jwt');

exports.register = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        const user = await User.create(email, hashedPassword, name);

        const token = generateToken(user.Id);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.Id,
                email: user.Email,
                name: user.Name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = bcrypt.compareSync(password, user.Password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user.Id);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.Id,
                email: user.Email,
                name: user.Name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.Id,
            email: user.Email,
            name: user.Name
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createVehicle = async (req, res) => {
    try {
        let { plate_number, type, model, year } = req.body;

        if (!plate_number || !/^[A-Za-z0-9]+$/.test(plate_number)) {
            return res.status(400).json({
                error: 'Номерний знак має містити тільки латинські літери (A-Z) та цифри (0-9)',
                example: 'AA1234BB, BC5678DE'
            });
        }

        plate_number = plate_number.toUpperCase();

        year = parseInt(year);
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear + 1) {
            return res.status(400).json({ error: `Рік має бути від 1900 до ${currentYear + 1}` });
        }

        const result = await Vehicle.create(plate_number, type, model, year);
        res.status(201).json({
            message: 'Транспортний засіб успішно додано',
            vehicle_id: result.vehicle_id,
            plate_number
        });
    } catch (error) {
        console.error('Create vehicle error:', error.message);

        if (error.message.includes('Номерний знак вже існує')) {
            return res.status(400).json({ error: error.message });
        }

        if (error.message.includes('латинські літери')) {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};
