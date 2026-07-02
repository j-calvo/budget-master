const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

router.get('/', accountController.getAccounts);
router.post('/', accountController.createAccount);
router.get('/adjustments/all', accountController.getAllAdjustments);
router.get('/:id', accountController.getAccountById);
router.put('/:id', accountController.updateAccount);
router.delete('/:id', accountController.deleteAccount);
router.post('/:id/adjust', accountController.adjustBalance);
router.get('/:id/adjustments', accountController.getAdjustments);
router.get('/:id/history', accountController.getAccountHistory);


module.exports = router;
