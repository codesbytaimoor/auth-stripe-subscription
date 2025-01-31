import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  useToast,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { subscriptionAPI } from '../../services/api';
import { SubscriptionInfo } from '../../types/subscription';

const SubscriptionDetails: React.FC = () => {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const toast = useToast();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const fetchSubscription = async () => {
    try {
      setIsLoading(true);
      const response = await subscriptionAPI.getSubscriptionDetails();
      setSubscription(response.subscription);
    } catch (error: any) {
      toast({
        title: 'Error fetching subscription',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      await subscriptionAPI.cancelSubscription();
      await fetchSubscription();
      toast({
        title: 'Success',
        description: 'Your subscription has been cancelled',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error cancelling subscription',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setIsReactivating(true);
      await subscriptionAPI.reactivateSubscription();
      await fetchSubscription();
      toast({
        title: 'Success',
        description: 'Your subscription has been reactivated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error reactivating subscription',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsReactivating(false);
    }
  };

  if (!subscription && !isLoading) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg">
        <Text>No active subscription found.</Text>
      </Box>
    );
  }

  return (
    <Box p={6} borderWidth="1px" borderRadius="lg">
      <VStack spacing={4} align="stretch">
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Subscription Details
          </Text>
        </Box>

        <Divider />

        {subscription && (
          <>
            <Box>
              <Text fontWeight="bold">Plan</Text>
              <Text fontSize="lg">{subscription.planType}</Text>
            </Box>

            <Box>
              <Text fontWeight="bold">Status</Text>
              <Badge
                colorScheme={
                  subscription.status === 'active'
                    ? 'green'
                    : subscription.status === 'canceled'
                    ? 'red'
                    : 'yellow'
                }
              >
                {subscription.status}
              </Badge>
            </Box>

            <Box>
              <Text fontWeight="bold">Current Period End</Text>
              <Text>{formatDate(subscription.currentPeriodEnd)}</Text>
            </Box>

            {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
              <Button
                colorScheme="red"
                onClick={handleCancel}
                isLoading={isCancelling}
              >
                Cancel Subscription
              </Button>
            )}

            {subscription.cancelAtPeriodEnd && (
              <>
                <Text color="red.500">
                  Your subscription will end on{' '}
                  {formatDate(subscription.currentPeriodEnd)}
                </Text>
                <Button
                  colorScheme="blue"
                  onClick={handleReactivate}
                  isLoading={isReactivating}
                >
                  Reactivate Subscription
                </Button>
              </>
            )}
          </>
        )}
      </VStack>
    </Box>
  );
};

export default SubscriptionDetails;
