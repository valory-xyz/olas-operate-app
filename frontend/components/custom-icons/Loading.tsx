import { TbLoader2 } from 'react-icons/tb';
import styled, { keyframes } from 'styled-components';

import { COLOR } from '@/constants';

const spin = keyframes`
  100% {
    transform: rotate(360deg);
  }
`;

const Spinner = styled.span`
  display: inline-flex;
  animation: ${spin} 1s linear infinite;
`;

type LoadingProps = {
  size?: number;
  color?: string;
};

export const Loading = ({
  size = 20,
  color = COLOR.TEXT_NEUTRAL_TERTIARY,
}: LoadingProps) => (
  <Spinner>
    <TbLoader2 size={size} color={color} />
  </Spinner>
);
