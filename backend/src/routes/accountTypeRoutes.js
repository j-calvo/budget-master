const express = require('express');
const router = express.Router();
const accountTypeController = require('../controllers/accountTypeController');

router.get('/', accountTypeController.getAccountTypes);
router.post('/', accountTypeController.createAccountType);
router.put('/:id', accountTypeController.updateAccountType);
router.delete('/:id', accountTypeController.deleteAccountType);

module.exports = router;
