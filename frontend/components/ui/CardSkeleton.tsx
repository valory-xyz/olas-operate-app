import { Flex, Skeleton } from 'antd';

import { cardStyles } from './styles';

/** Loading placeholder sized like a page card. */
export const CardSkeleton = () => (
  <Flex style={cardStyles}>
    <Skeleton active />
  </Flex>
);
