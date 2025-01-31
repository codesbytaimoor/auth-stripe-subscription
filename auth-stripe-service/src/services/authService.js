const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
  static generateAccessToken(user) {
    return jwt.sign(
      { 
        userId: user._id, 
        role: user.role 
      }, 
      process.env.JWT_ACCESS_SECRET, 
      { expiresIn: process.env.JWT_ACCESS_EXPIRY }
    );
  }

  static generateRefreshToken(user) {
    return jwt.sign(
      { 
        userId: user._id, 
        role: user.role 
      }, 
      process.env.JWT_REFRESH_SECRET, 
      { expiresIn: process.env.JWT_REFRESH_EXPIRY }
    );
  }

  static async login(email, password) {
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid login credentials');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token in user document
    user.refreshToken = refreshToken;
    await user.save();

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    };
  }

  static async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user || user.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      const newAccessToken = this.generateAccessToken(user);
      return newAccessToken;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static async logout(userId) {
    const user = await User.findById(userId);
    user.refreshToken = null;
    await user.save();
  }
}

module.exports = AuthService;
