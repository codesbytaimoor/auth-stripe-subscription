const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Plan = require('../models/Plan');

class PlanService {
  static async createPlan(planData) {
    const { name, description, type, price, features } = planData;

    // Create product in Stripe
    const product = await stripe.products.create({
      name,
      description,
      metadata: {
        type,
        features: JSON.stringify(features)
      }
    });

    let priceData = {
      product: product.id,
      unit_amount: price * 100,
      currency: 'usd'
    };

    if (type !== 'lifetime' && type !== 'free') {
      priceData.recurring = {
        interval: type === 'monthly' ? 'month' : 'year'
      };
    }

    const stripePrice = await stripe.prices.create(priceData);

    const plan = new Plan({
      name,
      description,
      type,
      price,
      features,
      stripePriceId: stripePrice.id,
      stripeProductId: product.id,
      isActive: true
    });

    await plan.save();
    return plan;
  }

  static async getPlans() {
    return await Plan.find({ isActive: true }).sort({ price: 1 });
  }

  static async getPlan(planId) {
    return await Plan.findOne({ _id: planId, isActive: true });
  }

  static async updatePlan(planId, updateData) {
    const plan = await Plan.findOne({ _id: planId, isActive: true });
    if (!plan) throw new Error('Plan not found');

    // Update in Stripe
    await stripe.products.update(plan.stripeProductId, {
      name: updateData.name,
      description: updateData.description,
      metadata: {
        type: updateData.type,
        features: JSON.stringify(updateData.features)
      }
    });

    if (updateData.price && updateData.price !== plan.price) {
      let priceData = {
        product: plan.stripeProductId,
        unit_amount: updateData.price * 100,
        currency: 'usd'
      };

      if (updateData.type !== 'lifetime' && updateData.type !== 'free') {
        priceData.recurring = {
          interval: updateData.type === 'monthly' ? 'month' : 'year'
        };
      }

      const newPrice = await stripe.prices.create(priceData);
      await stripe.prices.update(plan.stripePriceId, { active: false });
      plan.stripePriceId = newPrice.id;
    }

    Object.assign(plan, updateData);
    await plan.save();
    return plan;
  }

  static async deactivatePlan(planId) {
    const plan = await Plan.findOne({ _id: planId, isActive: true });
    if (!plan) throw new Error('Plan not found');

    // Deactivate in Stripe
    await stripe.products.update(plan.stripeProductId, { active: false });
    await stripe.prices.update(plan.stripePriceId, { active: false });

    plan.isActive = false;
    await plan.save();
    return plan;
  }

  static async getFreePlan() {
    return await Plan.findOne({ type: 'free', isActive: true });
  }
}

module.exports = PlanService;
