const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['free', 'monthly', 'yearly', 'lifetime'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stripePriceId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripeProductId: {
    type: String,
    unique: true,
    sparse: true
  },
  features: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create a unique compound index on name and isActive
PlanSchema.index({ name: 1, isActive: 1 }, { unique: true });

const Plan = mongoose.model('Plan', PlanSchema);
module.exports = Plan;
