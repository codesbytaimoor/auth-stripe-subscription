import axios from 'axios';
import { PaymentMethod, SubscriptionInfo, Plan } from '../types/subscription';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<string> => {
    try {
      const response = await api.post<{ accessToken: string }>('/auth/login', { email, password });
      const token = response.data.accessToken;
      localStorage.setItem('token', token);
      return token;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  register: async (email: string, password: string, name: string): Promise<string> => {
    try {
      const response = await api.post<{ token: string }>('/auth/register', { email, password, name });
      const token = response.data.token;
      localStorage.setItem('token', token);
      return token;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },
  
  logout: async () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

// Subscription API
export const subscriptionAPI = {
  getPlans: async () => {
    const response = await api.get<Plan[]>('/plans');
    return response.data;
  },

  createSetupIntent: async () => {
    const response = await api.post<{ clientSecret: string }>('/stripe/setup-intent');
    return response.data;
  },

  createSubscription: async (planId: string, couponId: string | null, paymentMethodId: string) => {
    const response = await api.post<{ subscriptionId: string }>('/stripe/subscription', {
      planId,
      couponId,
      paymentMethodId,
    });
    return response.data;
  },

  getPaymentMethods: async () => {
    const response = await api.get<PaymentMethod[]>('/stripe/payment-methods');
    return response.data;
  },

  setDefaultPaymentMethod: async (paymentMethodId: string) => {
    const response = await api.post<{ success: boolean }>('/stripe/set-default-payment-method', { paymentMethodId });
    return response.data;
  },

  removePaymentMethod: async (paymentMethodId: string) => {
    const response = await api.delete<{ success: boolean }>(`/stripe/payment-methods/${paymentMethodId}`);
    return response.data;
  },

  getSubscriptionDetails: async (): Promise<{ subscription: SubscriptionInfo }> => {
    const response = await api.get<{ subscription: SubscriptionInfo }>('/stripe/subscription');
    return response.data;
  },

  upgradeSubscription: async (newPlanId: string, couponId: string | null): Promise<{ subscription: SubscriptionInfo }> => {
    const response = await api.post<{ subscription: SubscriptionInfo }>('/stripe/subscription/upgrade', {
      newPlanId,
      couponId,
    });
    return response.data;
  },

  cancelSubscription: async (): Promise<{ subscription: SubscriptionInfo }> => {
    const response = await api.post<{ subscription: SubscriptionInfo }>('/stripe/subscription/cancel');
    return response.data;
  },

  reactivateSubscription: async (): Promise<{ subscription: SubscriptionInfo }> => {
    const response = await api.post<{ subscription: SubscriptionInfo }>('/stripe/subscription/reactivate');
    return response.data;
  }
};

export default api;
