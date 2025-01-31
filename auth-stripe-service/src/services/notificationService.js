const nodemailer = require('nodemailer');
require('dotenv').config();

class NotificationService {
  static transporter = nodemailer.createTransport({
    // Configure your email service here
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  static async sendEmail(to, subject, html) {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html
      });
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Email sending failed:', error);
    }
  }

  static async sendSubscriptionEndingNotification(user, subscription) {
    const daysLeft = Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    await this.sendEmail(
      user.email,
      'Subscription Ending Soon',
      `
        <h1>Your Subscription is Ending Soon</h1>
        <p>Dear ${user.username},</p>
        <p>Your subscription will end in ${daysLeft} days. To continue enjoying our services, please renew your subscription.</p>
        <p>If you don't renew, you'll automatically be moved to the free plan.</p>
        <a href="${process.env.FRONTEND_URL}/subscription">Renew Now</a>
      `
    );
  }

  static async sendSubscriptionEndedNotification(user) {
    await this.sendEmail(
      user.email,
      'Subscription Ended',
      `
        <h1>Your Subscription Has Ended</h1>
        <p>Dear ${user.username},</p>
        <p>Your subscription has ended and you've been moved to the free plan.</p>
        <p>Upgrade anytime to regain access to premium features.</p>
        <a href="${process.env.FRONTEND_URL}/subscription">Upgrade Now</a>
      `
    );
  }

  static async sendPaymentFailedNotification(user) {
    await this.sendEmail(
      user.email,
      'Payment Failed',
      `
        <h1>Payment Failed</h1>
        <p>Dear ${user.username},</p>
        <p>We couldn't process your latest subscription payment. Please update your payment method to continue using our services.</p>
        <a href="${process.env.FRONTEND_URL}/billing">Update Payment Method</a>
      `
    );
  }
}

module.exports = NotificationService;
