import { Steps as AntdSteps } from 'antd';
import { styled } from 'styled-components';

import { COLOR } from '@/constants';

export const Steps = styled(AntdSteps)`
  .ant-steps-item-title {
    color: ${COLOR.TEXT} !important;
  }

  .ant-steps-item-error .ant-steps-item-title {
    color: ${COLOR.RED} !important;
  }

  .ant-steps-item-description {
    color: ${COLOR.TEXT_NEUTRAL_TERTIARY} !important;
  }

  .ant-steps-item-wait .ant-steps-item-icon {
    background-color: ${COLOR.GRAY_1};
  }

  .ant-steps-item-icon {
    font-size: 16px !important;
    width: 32px !important;
    height: 32px !important;
    border-radius: 50% !important;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ant-steps-item-tail {
    inset-inline-start: 16px !important;
    top: 4px !important;
  }
`;
