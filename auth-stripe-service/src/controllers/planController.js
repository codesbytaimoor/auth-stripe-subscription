const PlanService = require('../services/planService');
const Plan = require('../models/Plan');

class PlanController {
  static async createPlan(req, res) {
    try {
      const { name, description, type, price, features } = req.body;
      
      // Validate required fields
      if (!name || !description || !type || price === undefined) {
        return res.status(400).json({ 
          error: 'Missing required fields' 
        });
      }

      const plan = await PlanService.createPlan({
        name,
        description,
        type,
        price,
        features: features || []
      });

      res.status(201).json(plan);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getPlans(req, res) {
    try {
      const plans = await PlanService.getPlans();
      res.status(200).json(plans);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getPlan(req, res) {
    try {
      const plan = await PlanService.getPlan(req.params.planId);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      res.status(200).json(plan);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updatePlan(req, res) {
    try {
      const { name, description, type, price, features } = req.body;
      const plan = await PlanService.updatePlan(req.params.planId, {
        name,
        description,
        type,
        price,
        features
      });
      res.status(200).json(plan);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deactivatePlan(req, res) {
    try {
      const plan = await PlanService.deactivatePlan(req.params.planId);
      res.status(200).json(plan);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = PlanController;
