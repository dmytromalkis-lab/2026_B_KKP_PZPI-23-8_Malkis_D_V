const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

router.get('/', vehicleController.getAllVehicles);

router.get('/unassigned', vehicleController.getUnassignedVehicles);

router.get('/assigned', vehicleController.getAssignedVehicles);

router.get('/stats', vehicleController.getVehicleStats);

router.get('/search', vehicleController.searchVehicles);

router.get('/:id', vehicleController.getVehicleById);

router.put('/:id', vehicleController.updateVehicle);

router.delete('/:id', vehicleController.deleteVehicle);

router.get('/:id/routes', vehicleController.getVehicleRouteHistory);

router.get('/:id/fuel-stats', vehicleController.getVehicleFuelStats);

router.get('/plate/:plate_number', vehicleController.findVehicleByPlate);

router.post('/assign-driver', vehicleController.assignDriver);

router.post('/unassign-driver', vehicleController.unassignDriver);

router.post('/', vehicleController.createVehicle);

module.exports = router;
