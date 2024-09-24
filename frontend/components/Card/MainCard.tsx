import { Card } from 'antd';
import { CardProps } from 'antd/es/card';
import { ReactNode } from 'react';
import styled from 'styled-components';

// check main.js for the height of the app
const HEIGHT_OF_APP = 700;

const StyledCard = styled(Card)`
  height: ${HEIGHT_OF_APP - 26}px;
  overflow: auto;
`;

export const MainCard = ({
  children,
  ...rest
}: { children: ReactNode } & CardProps) => (
  <StyledCard {...rest}>{children}</StyledCard>
);
