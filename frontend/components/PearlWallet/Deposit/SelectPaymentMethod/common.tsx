import { Flex } from 'antd';
import { styled } from 'styled-components';

import { CardFlex } from '@/components/ui';
import { COLOR } from '@/constants';

export const SelectPaymentMethodCard = styled(CardFlex)`
  width: 360px;
  border-color: ${COLOR.WHITE};
  .ant-card-body {
    height: 100%;
  }
`;

export const PaymentMethodCard = styled(CardFlex)`
  width: 624px;
  border-color: ${COLOR.WHITE};
  .ant-card-body {
    height: 100%;
  }
`;

export const YouWillPayContainer = styled(Flex)`
  background: ${COLOR.BACKGROUND};
  border-radius: 10px;
  padding: 12px 16px;
`;
