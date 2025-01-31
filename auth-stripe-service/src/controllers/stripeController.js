const StripeService = require('../services/stripeService');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan'); // Added this line
const NotificationService = require('../services/notificationService'); // Added this line

class StripeController {
  static async createCustomer(req, res) {
    try {
      const { email, name } = req.body;
      const customer = await StripeService.createCustomer(email, name);

      await User.findByIdAndUpdate(req.user._id, {
        stripeCustomerId: customer.id
      });

      res.status(201).json(customer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createSubscription(req, res) {
    try {
      const { planId, couponId, paymentMethodId } = req.body;

      if (!planId) {
        return res.status(400).json({
          error: 'planId is required'
        });
      }

      if (!paymentMethodId) {
        return res.status(400).json({
          error: 'paymentMethodId is required. Please add a payment method first.'
        });
      }

      const result = await StripeService.createSubscription(
        req.user._id,
        planId,
        couponId,
        paymentMethodId
      );

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async upgradeSubscription(req, res) {
    try {
      const { newPlanType, couponId } = req.body;

      // Validate plan type
      if (!['monthly', 'yearly', 'lifetime'].includes(newPlanType)) {
        return res.status(400).json({
          error: 'Invalid plan type. Must be monthly, yearly, or lifetime'
        });
      }

      // Get plan by type
      const plan = await Plan.findOne({ type: newPlanType, isActive: true });
      if (!plan) {
        return res.status(404).json({
          error: `No active plan found for type: ${newPlanType}`
        });
      }

      const result = await StripeService.upgradeSubscription(
        req.user._id,
        plan._id,
        couponId
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async cancelSubscription(req, res) {
    try {
      const result = await StripeService.cancelSubscription(req.user._id);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async reactivateSubscription(req, res) {
    try {
      const result = await StripeService.reactivateSubscription(req.user._id);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getSubscriptionDetails(req, res) {
    try {
      const user = await User.findById(req.user._id)
        .populate('currentSubscription');

      if (!user.currentSubscription) {
        return res.status(200).json({
          subscription: null,
          planType: 'free'
        });
      }

      res.status(200).json({
        subscription: user.currentSubscription
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createCoupon(req, res) {
    try {
      const { percentOff, duration, durationInMonths } = req.body;

      const coupon = await StripeService.createCoupon(
        percentOff,
        duration,
        durationInMonths
      );

      res.status(201).json(coupon);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async validateCoupon(req, res) {
    try {
      const { couponId } = req.body;
      const result = await StripeService.validateCoupon(couponId);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = StripeService.stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          const invoice = event.data.object;
          if (invoice.subscription) {
            const subscription = await Subscription.findOne({
              stripeSubscriptionId: invoice.subscription
            });

            if (subscription) {
              subscription.status = 'active';
              subscription.currentPeriodEnd = new Date(invoice.period_end * 1000);
              await subscription.save();
            }
          }
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          if (failedInvoice.subscription) {
            const subscription = await Subscription.findOne({
              stripeSubscriptionId: failedInvoice.subscription
            });

            if (subscription) {
              subscription.status = 'incomplete';
              await subscription.save();

              // Notify user about failed payment
              const user = await User.findById(subscription.userId);
              if (user) {
                await NotificationService.sendPaymentFailedNotification(user);
              }
            }
          }
          break;

        case 'customer.subscription.updated':
          const updatedSubscription = event.data.object;
          const localSubscription = await Subscription.findOne({
            stripeSubscriptionId: updatedSubscription.id
          });

          if (localSubscription) {
            localSubscription.status = updatedSubscription.status;
            localSubscription.cancelAtPeriodEnd = updatedSubscription.cancel_at_period_end;
            localSubscription.currentPeriodEnd = new Date(updatedSubscription.current_period_end * 1000);
            await localSubscription.save();
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object;
          const subToDelete = await Subscription.findOne({
            stripeSubscriptionId: deletedSubscription.id
          });

          if (subToDelete) {
            subToDelete.status = 'canceled';
            await subToDelete.save();

            // Remove from user's current subscription
            const user = await User.findById(subToDelete.userId);
            if (user && user.currentSubscription?.toString() === subToDelete._id.toString()) {
              user.currentSubscription = null;
              await user.save();
            }
          }
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async createSetupIntent(req, res) {
    try {
      const setupIntent = await StripeService.createSetupIntent(req.user._id);
      res.status(200).json({
        clientSecret: setupIntent.client_secret
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getPaymentMethods(req, res) {
    try {
      const paymentMethods = await StripeService.getPaymentMethods(req.user._id);
      res.status(200).json(paymentMethods);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async setDefaultPaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.params;
      const result = await StripeService.setDefaultPaymentMethod(
        req.user._id,
        paymentMethodId
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async removePaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.params;
      const result = await StripeService.removePaymentMethod(
        req.user._id,
        paymentMethodId
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = StripeController;
