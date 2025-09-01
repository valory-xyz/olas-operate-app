import { Table as AntdTable } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

export const Table = styled(AntdTable)`
  margin-top: 32px;

  .ant-table-thead {
    .ant-table-cell {
      padding: 10px 16px;
      border-bottom: none;
      font-weight: 400;
      font-size: 14px;
      color: ${COLOR.TEXT_NEUTRAL_TERTIARY};
      background-color: ${COLOR.BACKGROUND};

      &:first-child {
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
      }

      &:last-child {
        border-top-right-radius: 8px;
        border-bottom-right-radius: 8px;
      }

      &:before {
        display: none;
      }
    }
  }

  .ant-table-tbody {
    .ant-table-cell {
      padding: 14px 16px;
      border-color: ${COLOR.GRAY_4};
    }
  }
`;
