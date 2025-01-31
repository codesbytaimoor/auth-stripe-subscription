import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  useToast,
  Text,
} from '@chakra-ui/react';
import {
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { subscriptionAPI } from '../../services/api';

interface PaymentFormProps {
  planId: string;
  couponId: string | null;
  onSuccess: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, couponId , onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create Setup Intent
      const setupResponse = await subscriptionAPI.createSetupIntent();

      // 2. Confirm Card Setup
      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(
        setupResponse.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
          },
        }
      );

      if (setupError) {
        throw new Error(setupError.message);
      }

      if (setupIntent.payment_method) {
        toast({
          title: 'Payment method added',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      // 3. Create Subscription
      await subscriptionAPI.createSubscription(planId, couponId , setupIntent!.payment_method as string);

      toast({
        title: 'Success',
        description: 'Your subscription has been activated!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add payment method',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} p={4}>
      <VStack spacing={4}>
        <Box border="1px" borderColor="gray.200" p={4} borderRadius="md" w="full">
          <CardElement options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }} />
        </Box>

        <Button
          type="submit"
          colorScheme="blue"
          isLoading={isLoading}
          loadingText="Adding card..."
          disabled={!stripe}
          width="full"
        >
          Add Payment Method
        </Button>

        <Text fontSize="sm" color="gray.500">
          Your payment information will be securely stored for future transactions.
        </Text>
      </VStack>
    </Box>
  );
};

export default PaymentForm;
