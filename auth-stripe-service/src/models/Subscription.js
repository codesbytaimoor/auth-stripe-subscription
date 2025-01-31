const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stripeSubscriptionId: {
    type: String,
    default: null
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  planType: {
    type: String,
    enum: ['free', 'monthly', 'yearly', 'lifetime'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'expired', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  lastBillingDate: {
    type: Date
  },
  nextBillingDate: {
    type: Date
  }
}, {
  timestamps: true
});

const Subscription = mongoose.model('Subscription', SubscriptionSchema);
module.exports = Subscription;
