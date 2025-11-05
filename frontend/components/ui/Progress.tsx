import { Progress as AntdProgress, ProgressProps } from 'antd';
import styled from 'styled-components';

export const Progress = styled(AntdProgress)<ProgressProps>`
  .ant-progress-inner,
  .ant-progress-bg {
    border-radius: 2px;
  }
`;
