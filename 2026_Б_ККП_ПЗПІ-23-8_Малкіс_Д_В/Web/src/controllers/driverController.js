const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');


exports.getAssignmentHistory = async (req, res) => {
    res.status(501).json({ message: 'Метод getAssignmentHistory ще не реалізовано' });
};

exports.getAllDrivers = async (req, res) => {
    try {
        const drivers = await Driver.getAll();
        res.json(drivers);
    } catch (error) {
        console.error('Get drivers error:', error);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};

exports.getDriverById = async (req, res) => {
    try {
        const { id } = req.params;
        const driver = await Driver.getById(id);
        if (!driver) return res.status(404).json({ error: 'Водія не знайдено' });

        res.json(driver);
    } catch (error) {
        console.error('Get driver error:', error);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};

exports.createDriver = async (req, res) => {
    try {
        const { name, contact, license_number, status = 'active' } = req.body;
        if (!name || !contact || !license_number) {
            return res.status(400).json({ error: 'Ім\'я, контакт та номер посвідчення є обов\'язковими' });
        }

        const result = await Driver.create(name, contact, license_number, status);
        res.status(201).json({ message: 'Водія успішно створено', driver_id: result.driver_id });
    } catch (error) {
        console.error('Create driver error:', error);
        if (error.message.includes('вже використовується')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};

exports.updateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contact, license_number, status } = req.body;

        if (!name || !contact || !license_number || !status) {
            return res.status(400).json({ error: 'Всі поля є обов\'язковими' });
        }

        const existingDriver = await Driver.getById(id);
        if (!existingDriver) return res.status(404).json({ error: 'Водія не знайдено' });

        await Driver.update(id, name, contact, license_number, status);
        res.json({ message: 'Водія успішно оновлено' });
    } catch (error) {
        console.error('Update driver error:', error);
        if (error.message.includes('вже використовується')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};

exports.deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const existingDriver = await Driver.getById(id);
        if (!existingDriver) return res.status(404).json({ error: 'Водія не знайдено' });

        await Driver.delete(id);
        res.json({ message: 'Водія успішно видалено' });
    } catch (error) {
        console.error('Delete driver error:', error);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};

exports.getAvailableDrivers = async (req, res) => {
    try {
        const drivers = await Driver.getAvailableDrivers();
        res.json(drivers);
    } catch (error) {
        console.error('Get available drivers error:', error);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};

exports.getAvailableVehicles = async (req, res) => {
    try {
        const { id } = req.params; // id водія з URL
        const driver = await Driver.getById(id);
        if (!driver) return res.status(404).json({ error: 'Водія не знайдено' });

        const vehicles = await Driver.getAvailableVehicles();
        res.json(vehicles);
    } catch (error) {
        console.error('Get available vehicles error:', error);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};

exports.assignVehicle = async (req, res) => {
    try {
        const { driver_id } = req.params;
        const { vehicle_id } = req.body;

        if (!driver_id || !vehicle_id) {
            return res.status(400).json({ error: 'ID водія та ID транспорту є обов\'язковими' });
        }

        const driver = await Driver.getById(driver_id);
        if (!driver) return res.status(404).json({ error: 'Водія не знайдено' });

        const vehicle = await Vehicle.getById(vehicle_id);
        if (!vehicle) return res.status(404).json({ error: 'Транспортний засіб не знайдено' });

        const result = await Driver.assignVehicle(driver_id, vehicle_id);
        res.json({ message: 'Транспорт успішно призначено водію', data: result });
    } catch (error) {
        console.error('Assign vehicle error:', error);
        if (error.message.includes('вже зайнятий')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};

exports.unassignVehicle = async (req, res) => {
    try {
        const { driver_id } = req.params;

        if (!driver_id) return res.status(400).json({ error: 'ID водія є обов\'язковим' });

        const driver = await Driver.getById(driver_id);
        if (!driver) return res.status(404).json({ error: 'Водія не знайдено' });

        if (!driver.vehicle_id) {
            return res.status(400).json({ error: 'Цей водій не має призначеного транспорту' });
        }

        await Driver.unassignVehicle(driver_id);
        res.json({ message: 'Транспорт успішно відкріплено від водія' });
    } catch (error) {
        console.error('Unassign vehicle error:', error);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};

exports.getDriverWithVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const driver = await Driver.getById(id);

        if (!driver) return res.status(404).json({ error: 'Водія не знайдено' });

        res.json({
            driver_id: driver.driver_id,
            name: driver.name,
            contact: driver.contact,
            license_number: driver.license_number,
            status: driver.status,
            vehicle: driver.vehicle_id ? {
                vehicle_id: driver.vehicle_id,
                plate_number: driver.vehicle_plate,
                model: driver.vehicle_model
            } : null
        });
    } catch (error) {
        console.error('Get driver with vehicle error:', error);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
};
