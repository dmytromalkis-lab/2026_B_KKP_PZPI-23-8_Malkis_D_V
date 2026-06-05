const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, driverController.getAllDrivers);

router.get('/:id', authenticate, driverController.getDriverById);

router.post('/', authenticate, driverController.createDriver);

router.put('/:id', authenticate, driverController.updateDriver);

router.delete('/:id', authenticate, driverController.deleteDriver);

router.get('/:id/available-vehicles', authenticate, driverController.getAvailableVehicles);

router.post('/:driver_id/assign', authenticate, driverController.assignVehicle);

router.post('/:driver_id/unassign', authenticate, driverController.unassignVehicle);

router.get('/:driver_id/history', authenticate, driverController.getAssignmentHistory);

module.exports = router;
