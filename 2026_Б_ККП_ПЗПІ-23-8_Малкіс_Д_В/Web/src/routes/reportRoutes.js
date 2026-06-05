const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/drivers/pdf', reportController.generateDriversPDF);
router.get('/vehicles/pdf', reportController.generateVehiclesPDF);
router.get('/routes/pdf', reportController.generateRoutesPDF);

module.exports = router;