import { Collapse as AntdCollapse } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants';

export const Collapse = styled(AntdCollapse)`
  .ant-collapse-item {
    border-bottom-color: ${COLOR.GRAY_3};

    .ant-collapse-header {
      padding: 12px 16px 12px 0;
      align-items: center;

      .ant-collapse-expand-icon {
        margin: 0 6px;

        svg {
          width: 16px;
          height: 16px;
        }
      }
    }

    .ant-collapse-content-box {
      padding: 0 !important;
    }
  }
`;
