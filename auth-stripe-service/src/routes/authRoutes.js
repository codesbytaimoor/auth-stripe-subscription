const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticateUser, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', authenticateUser, AuthController.logout);

// Example of role-based routes
router.get('/admin', 
  authenticateUser, 
  authorizeRoles('admin', 'superadmin'), 
  (req, res) => {
    res.json({ message: 'Welcome to admin dashboard' });
  }
);

router.get('/superadmin', 
  authenticateUser, 
  authorizeRoles('superadmin'), 
  (req, res) => {
    res.json({ message: 'Welcome to superadmin dashboard' });
  }
);

module.exports = router;
