const express = require('express');
const PlanController = require('../controllers/planController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', PlanController.getPlans);
router.get('/:planId', PlanController.getPlan);

// Admin only routes
router.post('/', 
  authenticateUser, 
  authorizeRoles('admin', 'superadmin'), 
  PlanController.createPlan
);

router.put('/:planId', 
  authenticateUser, 
  authorizeRoles('admin', 'superadmin'), 
  PlanController.updatePlan
);

router.delete('/:planId', 
  authenticateUser, 
  authorizeRoles('admin', 'superadmin'), 
  PlanController.deactivatePlan
);

module.exports = router;
