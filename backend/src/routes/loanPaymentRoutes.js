const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :loanId
const loanPaymentController = require('../controllers/loanPaymentController');

// GET /api/loans/:loanId/payments
router.get('/', loanPaymentController.getLoanPayments);

// POST /api/loans/:loanId/payments
router.post('/', loanPaymentController.createLoanPayment);

// DELETE /api/loans/:loanId/payments/:paymentId
router.delete('/:paymentId', loanPaymentController.deleteLoanPayment);

// GET /api/loans/:loanId/schedule – amortization schedule
router.get('/schedule', loanPaymentController.getAmortizationSchedule);

module.exports = router;
