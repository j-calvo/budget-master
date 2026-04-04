const express = require('express');
const router = express.Router();
const pendingTransactionController = require('../controllers/pendingTransactionController');

router.get('/', pendingTransactionController.getPendingTransactions);
router.post('/:id/approve', pendingTransactionController.approveTransaction);
router.post('/:id/discard', pendingTransactionController.discardTransaction);

module.exports = router;
