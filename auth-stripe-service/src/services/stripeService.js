const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Coupon = require('../models/Coupon');
const NotificationService = require('./notificationService');
const PlanService = require('./planService');

class StripeService {
  static async createCustomer(email, name) {
    return await stripe.customers.create({
      email,
      name
    });
  }

  static async createSetupIntent(userId) {
    const user = await User.findById(userId);
    if (!user.stripeCustomerId) {
      throw new Error('User does not have a Stripe customer ID');
    }

    return await stripe.setupIntents.create({
      customer: user.stripeCustomerId,
      usage: 'off_session' // Allow using this payment method for future payments
    });
  }

  static async getPaymentMethods(userId) {
    const user = await User.findById(userId);
    if (!user.stripeCustomerId) {
      throw new Error('User does not have a Stripe customer ID');
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card'
    });

    // Get the customer to check default payment method
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);
    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

    // Add isDefault flag to payment methods
    return paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      isDefault: pm.id === defaultPaymentMethodId
    }));
  }

  static async setDefaultPaymentMethod(userId, paymentMethodId) {
    const user = await User.findById(userId);
    if (!user.stripeCustomerId) {
      throw new Error('User does not have a Stripe customer ID');
    }

    // Verify the payment method belongs to the customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== user.stripeCustomerId) {
      throw new Error('Payment method does not belong to this customer');
    }

    // Set as default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    return { success: true };
  }

  static async removePaymentMethod(userId, paymentMethodId) {
    const user = await User.findById(userId);
    if (!user.stripeCustomerId) {
      throw new Error('User does not have a Stripe customer ID');
    }

    // Verify the payment method belongs to the customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== user.stripeCustomerId) {
      throw new Error('Payment method does not belong to this customer');
    }

    // If this is the default payment method, remove it from customer's default
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);
    if (customer.invoice_settings?.default_payment_method === paymentMethodId) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: null }
      });
    }

    // Detach the payment method
    await stripe.paymentMethods.detach(paymentMethodId);

    return { success: true };
  }

  static async createPaymentIntent(amount, currency = 'usd') {
    return await stripe.paymentIntents.create({
      amount,
      currency
    });
  }

  static async createSubscription(userId, planId, couponId = null, paymentMethodId = null) {
    const user = await User.findById(userId);
    if (!user.stripeCustomerId) {
      throw new Error('User does not have a Stripe customer ID');
    }

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      userId: user._id,
      status: { $in: ['active', 'trialing'] }
    });

    if (existingSubscription) {
      throw new Error('You already have an active subscription. Please upgrade or cancel your current subscription first.');
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      throw new Error('Plan not found or inactive');
    }

    // If payment method provided, attach it and set as default
    if (paymentMethodId) {
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: user.stripeCustomerId,
        });

        await stripe.customers.update(user.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      } catch (error) {
        throw new Error(`Failed to setup payment method: ${error.message}`);
      }
    }

    const subscriptionData = {
      customer: user.stripeCustomerId,
      items: [{ price: plan.stripePriceId }],
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
      automatic_tax: { enabled: true },
      collection_method: 'charge_automatically'
    };

    // Add coupon if provided
    if (couponId) {
      const coupon = await Coupon.findById(couponId);
      if (coupon && coupon.isActive) {
        subscriptionData.coupon = coupon.stripeCouponId;
      }
    }

    const subscription = await stripe.subscriptions.create(subscriptionData);

    // Create subscription record in our database
    const newSubscription = await Subscription.create({
      userId: user._id,
      planId: plan._id,
      planType: plan.type,
      status: subscription.status,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });

    return {
      subscriptionId: newSubscription._id,
      clientSecret: subscription.latest_invoice.payment_intent?.client_secret
    };
  }

  static async upgradeSubscription(userId, newPlanId, couponId = null) {
    const user = await User.findById(userId).populate('currentSubscription');
    if (!user.currentSubscription) {
      throw new Error('No active subscription found');
    }

    const newPlan = await Plan.findOne({ _id: newPlanId, isActive: true });
    console.log(newPlan, newPlanId, "newPlan?")
    if (!newPlan) {
      throw new Error('New plan not found or inactive');
    }
    const newPlanType = newPlan.type;

    // Get current plan by type
    const currentPlan = await Plan.findOne({ type: user.currentSubscription.planType, isActive: true });
    if (!currentPlan) {
      throw new Error('Current plan not found');
    }

    // Determine if this is an upgrade or downgrade
    const isUpgrade = newPlan.price > currentPlan.price;

    // Get the current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      user.currentSubscription.stripeSubscriptionId
    );

    // Prepare the update data
    const updateData = {
      items: [{
        id: subscription.items.data[0].id,
        price: newPlan.stripePriceId,
      }],
      proration_behavior: isUpgrade ? 'always_invoice' : 'none',
      collection_method: 'charge_automatically'
    };

    // Add coupon if provided
    if (couponId) {
      const coupon = await Coupon.findById(couponId);
      if (coupon && coupon.isActive) {
        updateData.coupon = coupon.stripeCouponId;
      }
    }

    // Update the subscription
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      updateData
    );

    // Update our database record
    await Subscription.findByIdAndUpdate(user.currentSubscription._id, {
      planType: newPlanType,
      status: updatedSubscription.status,
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end
    });

    return updatedSubscription;
  }

  static async cancelSubscription(userId) {
    const user = await User.findById(userId).populate('currentSubscription');
    if (!user.currentSubscription) {
      throw new Error('No active subscription found');
    }

    // Cancel at Stripe
    const canceledSub = await stripe.subscriptions.update(
      user.currentSubscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // Update local subscription
    await Subscription.findByIdAndUpdate(user.currentSubscription._id, {
      status: 'canceled',
      cancelAtPeriodEnd: true
    });

    return canceledSub;
  }

  static async reactivateSubscription(userId) {
    const user = await User.findById(userId).populate('currentSubscription');
    if (!user.currentSubscription) {
      throw new Error('No subscription found');
    }

    // Reactivate at Stripe
    const reactivatedSub = await stripe.subscriptions.update(
      user.currentSubscription.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );

    // Update local subscription
    await Subscription.findByIdAndUpdate(user.currentSubscription._id, {
      status: 'active',
      cancelAtPeriodEnd: false
    });

    return reactivatedSub;
  }

  static async handleWebhook(payload, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
      }

      return event;
    } catch (error) {
      throw new Error(`Webhook Error: ${error.message}`);
    }
  }

  static async handleSubscriptionUpdated(subscription) {
    const localSub = await Subscription.findOne({
      stripeSubscriptionId: subscription.id
    });
    if (!localSub) return;

    localSub.status = subscription.status;
    localSub.nextBillingDate = new Date(subscription.current_period_end * 1000);
    await localSub.save();

    // Check if subscription is ending soon (7 days before)
    const daysUntilEnd = Math.ceil((localSub.nextBillingDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd <= 7) {
      const user = await User.findById(localSub.userId);
      await NotificationService.sendSubscriptionEndingNotification(user, localSub);
    }
  }

  static async handleSubscriptionDeleted(subscription) {
    const localSub = await Subscription.findOne({
      stripeSubscriptionId: subscription.id
    });
    if (!localSub) return;

    localSub.status = 'expired';
    await localSub.save();

    // Move user to free plan
    const user = await User.findById(localSub.userId);
    const freePlan = await PlanService.getFreePlan();

    if (freePlan) {
      await this.createSubscription(user._id, freePlan._id);
      await NotificationService.sendSubscriptionEndedNotification(user);
    }
  }

  static async handlePaymentSucceeded(invoice) {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription
    });
    if (!subscription) return;

    subscription.lastBillingDate = new Date();
    subscription.status = 'active';
    await subscription.save();
  }

  static async handlePaymentFailed(invoice) {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription
    });
    if (!subscription) return;

    const user = await User.findById(subscription.userId);
    await NotificationService.sendPaymentFailedNotification(user);
  }
}

module.exports = StripeService;
