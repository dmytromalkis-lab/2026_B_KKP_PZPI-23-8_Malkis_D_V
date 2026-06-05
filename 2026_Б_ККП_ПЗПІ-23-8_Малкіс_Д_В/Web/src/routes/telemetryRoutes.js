const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetryController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', telemetryController.getAllTelemetry);

router.get('/active', telemetryController.getActiveTrips);

router.get('/stats', telemetryController.getTripStats);

router.get('/:id', telemetryController.getTelemetryById);

router.get('/vehicle/:vehicleId', telemetryController.getTelemetryByVehicle);

router.post('/start', telemetryController.startTrip);

router.post('/end', telemetryController.endTrip);

router.put('/:telemetry_id', telemetryController.updateTelemetry);

router.delete('/:id', telemetryController.deleteTelemetry);

module.exports = router;