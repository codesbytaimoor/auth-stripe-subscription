import api from '../services/api';
import { SubscriptionInfo } from '../types/subscription';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

interface PaymentIntent {
  clientSecret: string;
}

const subscriptionAPI = {
  getPlans: async (): Promise<Plan[]> => {
    const response = await api.get('/subscription/plans');
    return response.data;
  },

  createPaymentIntent: async (planId: string): Promise<PaymentIntent> => {
    const response = await api.post('/subscription/create-payment-intent', { planId });
    return response.data;
  },

  confirmSubscription: async (subscriptionId: string) => {
    const response = await api.post('/subscription/confirm', { subscriptionId });
    return response.data;
  },

  getSubscriptionDetails: async (): Promise<{ subscription: SubscriptionInfo }> => {
    const response = await api.get<{ subscription: SubscriptionInfo }>('/subscription');
    return response.data;
  },

  upgradeSubscription: async (newPlanType: string, couponId: string | null): Promise<{ subscription: SubscriptionInfo }> => {
    const response = await api.post<{ subscription: SubscriptionInfo }>('/subscription/upgrade', {
      newPlanType,
      couponId,
    });
    return response.data;
  },

  cancelSubscription: async (): Promise<{ subscription: SubscriptionInfo }> => {
    const response = await api.post<{ subscription: SubscriptionInfo }>('/subscription/cancel');
    return response.data;
  },

  reactivateSubscription: async (): Promise<{ subscription: SubscriptionInfo }> => {
    const response = await api.post<{ subscription: SubscriptionInfo }>('/subscription/reactivate');
    return response.data;
  }
};

export default subscriptionAPI;
