const User = require('../models/User');
const AuthService = require('../services/authService');

class AuthController {
  static async register(req, res) {
    try {
      const { username, email, password, role } = req.body;

      const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
      });

      if (existingUser) {
        return res.status(400).json({ 
          error: 'User with this email or username already exists' 
        });
      }

      const user = new User({ 
        username, 
        email, 
        password,
        role: role || 'user'  // Default to user if no role specified
      });

      await user.save();

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      
      const { user, accessToken, refreshToken } = await AuthService.login(email, password);

      res.cookie('accessToken', accessToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production' 
      });

      res.cookie('refreshToken', refreshToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production' 
      });

      res.status(200).json({ user, accessToken, refreshToken });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      const newAccessToken = await AuthService.refreshAccessToken(refreshToken);

      res.cookie('accessToken', newAccessToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production' 
      });

      res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  static async logout(req, res) {
    try {
      await AuthService.logout(req.user._id);

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AuthController;
