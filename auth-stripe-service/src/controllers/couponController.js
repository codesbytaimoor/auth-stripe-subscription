const Coupon = require('../models/Coupon');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class CouponController {
  static async createCoupon(req, res) {
    try {
      const { 
        code, 
        type, 
        value, 
        validUntil, 
        maxUses, 
        applicablePlans 
      } = req.body;

      // Create coupon in Stripe
      let stripeCouponData = {
        duration: 'once',
        id: code.toUpperCase()
      };

      if (type === 'percentage') {
        stripeCouponData.percent_off = value;
      } else {
        stripeCouponData.amount_off = value * 100; // Convert to cents
        stripeCouponData.currency = 'usd'; // Required for amount_off coupons
      }

      const stripeCoupon = await stripe.coupons.create(stripeCouponData);

      // Create coupon in database
      const coupon = new Coupon({
        code: code.toUpperCase(),
        type,
        value,
        validUntil: validUntil ? new Date(validUntil) : null,
        maxUses,
        stripeCouponId: stripeCoupon.id,
        applicablePlans
      });

      await coupon.save();
      res.status(201).json(coupon);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCoupons(req, res) {
    try {
      const coupons = await Coupon.find()
        .populate('applicablePlans', 'name type price')
        .sort('-createdAt');
      res.status(200).json(coupons);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCoupon(req, res) {
    try {
      const coupon = await Coupon.findById(req.params.couponId)
        .populate('applicablePlans', 'name type price');
      
      if (!coupon) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      res.status(200).json(coupon);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async validateCoupon(req, res) {
    try {
      const { code, planId } = req.body;

      const coupon = await Coupon.findOne({ 
        code: code.toUpperCase(),
        isActive: true
      }).populate('applicablePlans');

      if (!coupon) {
        return res.status(404).json({ 
          valid: false, 
          error: 'Coupon not found' 
        });
      }

      // Check if coupon is valid
      if (!coupon.isValid()) {
        return res.status(400).json({ 
          valid: false, 
          error: 'Coupon has expired or reached maximum uses' 
        });
      }

      // Check if coupon is applicable to the plan
      if (planId && coupon.applicablePlans.length > 0) {
        const isPlanApplicable = coupon.applicablePlans
          .some(plan => plan._id.toString() === planId);
        
        if (!isPlanApplicable) {
          return res.status(400).json({ 
            valid: false, 
            error: 'Coupon is not applicable to this plan' 
          });
        }
      }

      res.status(200).json({ 
        valid: true, 
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          validUntil: coupon.validUntil
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deactivateCoupon(req, res) {
    try {
      const coupon = await Coupon.findById(req.params.couponId);
      
      if (!coupon) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      // Deactivate in Stripe
      await stripe.coupons.del(coupon.stripeCouponId);

      // Deactivate in database
      coupon.isActive = false;
      await coupon.save();

      res.status(200).json({ message: 'Coupon deactivated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateCoupon(req, res) {
    try {
      const { couponId } = req.params;
      const updateData = req.body;
      
      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      // Fields that cannot be updated
      delete updateData.code;
      delete updateData.type;
      delete updateData.stripeCouponId;
      delete updateData.currentUses;

      // Update in Stripe if value changes
      if (updateData.value && updateData.value !== coupon.value) {
        // Delete old coupon in Stripe
        await stripe.coupons.del(coupon.stripeCouponId);

        // Create new coupon in Stripe
        let stripeCouponData = {
          duration: 'once',
          id: coupon.code
        };

        if (coupon.type === 'percentage') {
          stripeCouponData.percent_off = updateData.value;
        } else {
          stripeCouponData.amount_off = updateData.value * 100;
          stripeCouponData.currency = 'usd';
        }

        const stripeCoupon = await stripe.coupons.create(stripeCouponData);
        coupon.stripeCouponId = stripeCoupon.id;
      }

      // Update allowed fields
      if (updateData.validUntil) {
        coupon.validUntil = new Date(updateData.validUntil);
      }
      if (updateData.maxUses !== undefined) {
        coupon.maxUses = updateData.maxUses;
      }
      if (updateData.value) {
        coupon.value = updateData.value;
      }
      if (Array.isArray(updateData.applicablePlans)) {
        coupon.applicablePlans = updateData.applicablePlans;
      }
      if (typeof updateData.isActive === 'boolean') {
        coupon.isActive = updateData.isActive;
      }

      await coupon.save();
      
      const updatedCoupon = await Coupon.findById(couponId)
        .populate('applicablePlans', 'name type price');

      res.status(200).json(updatedCoupon);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = CouponController;
