const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/evChargingController');

router.get('/', ctrl.getEvLogs);
router.post('/', ctrl.createEvLog);
router.put('/:id', ctrl.updateEvLog);
router.delete('/:id', ctrl.deleteEvLog);

module.exports = router;
