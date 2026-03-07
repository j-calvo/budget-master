const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const loanPaymentRoutes = require('./loanPaymentRoutes');

router.get('/', loanController.getLoans);
router.post('/', loanController.createLoan);
router.put('/:id', loanController.updateLoan);
router.patch('/:id/apr', loanController.updateAPR);
router.delete('/:id', loanController.deleteLoan);

// Nested payment routes: /api/loans/:loanId/payments and /api/loans/:loanId/schedule
router.use('/:loanId/payments', loanPaymentRoutes);
router.get('/:loanId/schedule', require('../controllers/loanPaymentController').getAmortizationSchedule);

module.exports = router;
