const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

// Email Integrations
router.get('/email-config', settingsController.getEmailConfig);
router.put('/email-config', settingsController.updateEmailConfig);
router.get('/parsing-rules', settingsController.getParsingRules);
router.post('/parsing-rules', settingsController.addParsingRule);
router.put('/parsing-rules/:id', settingsController.updateParsingRule);
router.delete('/parsing-rules/:id', settingsController.deleteParsingRule);

module.exports = router;
