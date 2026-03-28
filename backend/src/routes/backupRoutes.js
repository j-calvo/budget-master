const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const backupController = require('../controllers/backupController');

// All backup routes require admin role
router.post('/', requireAdmin, backupController.createBackup);
router.get('/', requireAdmin, backupController.listBackups);
router.get('/:name/download', requireAdmin, backupController.downloadBackup);
router.delete('/:name', requireAdmin, backupController.deleteBackup);
router.post('/:name/restore', requireAdmin, backupController.restoreBackup);

module.exports = router;
