const express = require('express');
const StripeController = require('../controllers/stripeController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Customer routes
router.post('/customer', authenticateUser, StripeController.createCustomer);

// Payment Method routes
router.post('/setup-intent', authenticateUser, StripeController.createSetupIntent);
router.get('/payment-methods', authenticateUser, StripeController.getPaymentMethods);
router.post('/payment-methods/:paymentMethodId/default', authenticateUser, StripeController.setDefaultPaymentMethod);
router.delete('/payment-methods/:paymentMethodId', authenticateUser, StripeController.removePaymentMethod);

// Subscription routes
router.post('/subscription', authenticateUser, StripeController.createSubscription);
router.post('/subscription/upgrade', authenticateUser, StripeController.upgradeSubscription);
router.post('/subscription/cancel', authenticateUser, StripeController.cancelSubscription);
router.post('/subscription/reactivate', authenticateUser, StripeController.reactivateSubscription);
router.get('/subscription', authenticateUser, StripeController.getSubscriptionDetails);

// Coupon routes (admin only)
router.post('/coupon',
  authenticateUser,
  authorizeRoles('admin', 'superadmin'),
  StripeController.createCoupon
);
router.post('/coupon/validate', authenticateUser, StripeController.validateCoupon);

// Webhook
router.post('/webhook', StripeController.handleWebhook);

module.exports = router;
