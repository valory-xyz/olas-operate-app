import { Divider as AntdDivider } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

export const Divider = styled(AntdDivider)`
  margin: 0;
  border-color: ${COLOR.GRAY_3};
`;
