const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { requireAdmin } = require('../middleware/auth');

router.get('/', familyController.getFamilyDetails);
router.delete('/members/:memberId', requireAdmin, familyController.removeMember);
router.post('/invite-code', requireAdmin, familyController.generateNewInviteCode);

module.exports = router;
