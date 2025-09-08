import { Modal } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

export const CustomModal = styled(Modal)<{ bodyPadding?: boolean }>`
  top: 24px;
  height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;

  .ant-modal-content {
    height: calc(100vh - 48px);
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .ant-modal-header {
    padding: 16px 24px;
    margin: 0;
    border-bottom: 1px solid ${COLOR.BORDER_GRAY};
  }

  .ant-modal-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    border-radius: 12px;
    padding: ${({ bodyPadding }) => (bodyPadding ? '20px' : '0')};
  }
`;
