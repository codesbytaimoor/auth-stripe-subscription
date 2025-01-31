const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['percentage', 'amount'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        if (this.type === 'percentage') {
          return v <= 100; // Percentage should not exceed 100
        }
        return true; // No upper limit for amount
      },
      message: 'Percentage discount cannot exceed 100%'
    }
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date
  },
  maxUses: {
    type: Number,
    default: null
  },
  currentUses: {
    type: Number,
    default: 0
  },
  stripeCouponId: {
    type: String,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicablePlans: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan'
  }]
}, {
  timestamps: true
});

// Check if coupon is valid
CouponSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if coupon is active
  if (!this.isActive) return false;

  // Check if coupon has expired
  if (this.validUntil && now > this.validUntil) return false;

  // Check if maximum uses reached
  if (this.maxUses !== null && this.currentUses >= this.maxUses) return false;

  return true;
};

const Coupon = mongoose.model('Coupon', CouponSchema);
module.exports = Coupon;
