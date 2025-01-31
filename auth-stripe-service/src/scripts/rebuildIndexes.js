require('dotenv').config();
const mongoose = require('mongoose');
const Plan = require('../models/Plan');

async function rebuildIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Plan.rebuildIndexes();
    console.log('Plan indexes rebuilt successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

rebuildIndexes();
