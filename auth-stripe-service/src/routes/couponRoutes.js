const express = require('express');
const CouponController = require('../controllers/couponController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Admin routes
router.post('/',
  authenticateUser,
  authorizeRoles('admin', 'superadmin'),
  CouponController.createCoupon
);

router.get('/',
  authenticateUser,
  authorizeRoles('user', 'admin', 'superadmin'),
  CouponController.getCoupons
);

router.get('/:couponId',
  authenticateUser,
  authorizeRoles('user', 'admin', 'superadmin'),
  CouponController.getCoupon
);

router.put('/:couponId',
  authenticateUser,
  authorizeRoles('admin', 'superadmin'),
  CouponController.updateCoupon
);

router.delete('/:couponId',
  authenticateUser,
  authorizeRoles('admin', 'superadmin'),
  CouponController.deactivateCoupon
);

// Public routes
router.post('/validate', CouponController.validateCoupon);

module.exports = router;
