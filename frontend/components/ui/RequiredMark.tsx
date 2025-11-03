import { Flex, Typography } from 'antd';
import type { ReactNode } from 'react';

const { Text } = Typography;

export const RequiredMark = (
  label: ReactNode,
  { required }: { required: boolean },
) => (
  <Flex align="center" gap={4}>
    {label}
    {required && <Text type="danger">*</Text>}
  </Flex>
);
