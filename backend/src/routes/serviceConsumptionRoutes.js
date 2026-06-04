const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const router = express.Router();
const serviceConsumptionController = require('../controllers/serviceConsumptionController');

router.get('/', serviceConsumptionController.getConsumptions);
router.post('/', serviceConsumptionController.createConsumption);
router.put('/:id', serviceConsumptionController.updateConsumption);
router.delete('/:id', serviceConsumptionController.deleteConsumption);
router.post('/parse', upload.single('file'), serviceConsumptionController.parseInvoicePdf);

module.exports = router;
