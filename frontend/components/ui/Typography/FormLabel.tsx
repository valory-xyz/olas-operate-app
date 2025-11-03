import { Typography } from 'antd';
import { ReactNode } from 'react';
import styled from 'styled-components';

const { Text: AntDText } = Typography;

const Text = styled(AntDText)`
  padding-bottom: 4px;
`;

export const FormLabel = ({ children }: { children: ReactNode }) => (
  <Text className="text-neutral-secondary text-sm">{children}</Text>
);
