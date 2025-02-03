import React, { useState, useEffect } from 'react';
import { Container, Heading, SimpleGrid, VStack, Spinner, Alert, AlertIcon, AlertDescription, useToast } from '@chakra-ui/react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PlanCard from '../components/subscription/PlanCard';
import PaymentForm from '../components/subscription/PaymentForm';
import subscriptionAPI from '../api/subscriptionAPI';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

const plans = [
  {
    name: 'Monthly',
    price: 9.99,
    features: ['Feature 1', 'Feature 2', 'Feature 3'],
    type: 'monthly',
    id: '67a123da0a27be2768a56ce7',
    couponId: null
  },
  {
    name: 'Pro Yearly',
    price: 99.99,
    features: ['All Basic Features', 'Feature 4', 'Feature 5', 'Feature 6'],
    type: 'yearly',
    isPopular: true,
    id: '67a125020a27be2768a56e25',
    couponId: null
  },
  {
    name: 'Lifetime',
    price: 49.99,
    features: ['All Pro Features', 'Feature 7', 'Feature 8', 'Feature 9'],
    type: 'lifetime',
    id: '67a125b40a27be2768a56eef',
    couponId: null
  }
];

const SubscriptionPage = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadCurrentSubscription();
  }, []);

  const loadCurrentSubscription = async () => {
    try {
      const response = await subscriptionAPI.getSubscriptionDetails();
      setCurrentSubscription(response.subscription);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = async (planId: string, couponId: string | null) => {
    if (currentSubscription) {
      // Show upgrade/downgrade confirmation
      const selectedPlan = plans.find(p => p.id === planId);
      const currentPlan = plans.find(p => p.type === currentSubscription.planType);
      
      if (!selectedPlan || !currentPlan) {
        toast({
          title: 'Error',
          description: 'Could not find plan details',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const isUpgrade = selectedPlan.price > currentPlan.price;
      const action = isUpgrade ? 'upgrade to' : 'downgrade to';

      if (window.confirm(`You currently have the ${currentPlan.name} plan. Do you want to ${action} ${selectedPlan.name}?`)) {
        try {
          await subscriptionAPI.upgradeSubscription(selectedPlan.type, couponId);
          toast({
            title: 'Success',
            description: `Successfully ${action}d your subscription!`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
          // Refresh subscription details
          loadCurrentSubscription();
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error.response?.data?.error || 'Failed to update subscription',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      }
    } else {
      // New subscription
      setSelectedPlan(planId);
      setCouponId(couponId);
    }
  };

  const handlePaymentSuccess = () => {
    loadCurrentSubscription();
    setSelectedPlan(null);
    setCouponId(null);
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8}>
        <Heading>Choose Your Plan</Heading>
        {currentSubscription && (
          <Alert status="info">
            <AlertIcon />
            <AlertDescription>
              You are currently on the {plans.find(p => p.id === currentSubscription.planId)?.name} plan.
              {currentSubscription.cancelAtPeriodEnd && ' Your subscription will end at the current period.'}
            </AlertDescription>
          </Alert>
        )}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} w="full">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              couponId={couponId}
              name={plan.name}
              price={plan.price}
              features={plan.features}
              type={plan.type}
              isPopular={plan.isPopular}
              onSelect={() => handlePlanSelect(plan.id, plan.couponId)}
            />
          ))}
        </SimpleGrid>

        {selectedPlan && (
          <Elements stripe={stripePromise}>
            <PaymentForm
              planId={selectedPlan}
              couponId={couponId}
              onSuccess={handlePaymentSuccess}
            />
          </Elements>
        )}
      </VStack>
    </Container>
  );
};

export default SubscriptionPage;
