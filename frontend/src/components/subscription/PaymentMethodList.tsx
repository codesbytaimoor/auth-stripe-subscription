import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  useToast,
  Icon,
  IconButton,
} from '@chakra-ui/react';
import { DeleteIcon, StarIcon } from '@chakra-ui/icons';
import { subscriptionAPI } from '../../services/api';
import { PaymentMethod } from '../../types/subscription';

const PaymentMethodList: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const methods = await subscriptionAPI.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error: any) {
      toast({
        title: 'Error fetching payment methods',
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
    fetchPaymentMethods();
  }, []);

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      await subscriptionAPI.setDefaultPaymentMethod(paymentMethodId);
      await fetchPaymentMethods();
      toast({
        title: 'Success',
        description: 'Default payment method updated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error setting default payment method',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRemove = async (paymentMethodId: string) => {
    try {
      await subscriptionAPI.removePaymentMethod(paymentMethodId);
      await fetchPaymentMethods();
      toast({
        title: 'Success',
        description: 'Payment method removed',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error removing payment method',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <VStack spacing={4} align="stretch" w="full">
      <Text fontSize="xl" fontWeight="bold">
        Saved Payment Methods
      </Text>
      {paymentMethods.map((method) => (
        <Box
          key={method.id}
          p={4}
          borderWidth="1px"
          borderRadius="md"
          position="relative"
        >
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Text>
                {method.brand.toUpperCase()} •••• {method.last4}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Expires {method.expMonth}/{method.expYear}
              </Text>
            </VStack>
            <HStack>
              {!method.isDefault && (
                <IconButton
                  aria-label="Set as default"
                  icon={<Icon as={StarIcon} />}
                  size="sm"
                  onClick={() => handleSetDefault(method.id)}
                />
              )}
              <IconButton
                aria-label="Remove payment method"
                icon={<DeleteIcon />}
                size="sm"
                colorScheme="red"
                onClick={() => handleRemove(method.id)}
              />
            </HStack>
          </HStack>
          {method.isDefault && (
            <Text
              position="absolute"
              top={2}
              right={2}
              fontSize="xs"
              color="green.500"
              fontWeight="bold"
            >
              Default
            </Text>
          )}
        </Box>
      ))}
      {paymentMethods.length === 0 && !isLoading && (
        <Text color="gray.500">No payment methods found</Text>
      )}
    </VStack>
  );
};

export default PaymentMethodList;
