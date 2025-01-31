import React from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  List,
  ListItem,
  ListIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';

interface PlanProps {
  name: string;
  price: number;
  features: string[];
  couponId: string | null;
  type: string;
  isPopular?: boolean;
  onSelect: () => void;
}

const PlanCard: React.FC<PlanProps> = ({
  name,
  price,
  features,
  type,
  isPopular = false,
  onSelect,
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const popularBorderColor = useColorModeValue('blue.500', 'blue.300');

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      borderColor={isPopular ? popularBorderColor : borderColor}
      p={6}
      bg={bgColor}
      position="relative"
      shadow={isPopular ? 'md' : 'sm'}
    >
      {isPopular && (
        <Text
          position="absolute"
          top="-3"
          right="50%"
          transform="translateX(50%)"
          bg="blue.500"
          color="white"
          px={3}
          py={1}
          borderRadius="full"
          fontSize="sm"
          fontWeight="semibold"
        >
          Most Popular
        </Text>
      )}
      <VStack spacing={4} align="stretch">
        <Box textAlign="center">
          <Text fontSize="2xl" fontWeight="bold">
            {name}
          </Text>
          <Text fontSize="4xl" fontWeight="bold" mt={2}>
            ${price}
            <Text as="span" fontSize="lg" fontWeight="medium">
              /month
            </Text>
          </Text>
        </Box>

        <List spacing={3}>
          {features.map((feature, index) => (
            <ListItem key={index} display="flex" alignItems="center">
              <ListIcon as={CheckIcon} color="green.500" />
              <Text>{feature}</Text>
            </ListItem>
          ))}
        </List>

        <Button
          colorScheme={isPopular ? 'blue' : 'gray'}
          size="lg"
          w="full"
          mt={4}
          onClick={onSelect}
        >
          Select Plan
        </Button>
      </VStack>
    </Box>
  );
};

export default PlanCard;
