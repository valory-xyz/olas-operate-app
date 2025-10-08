import { Table as AntdTable, TableProps } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

export const TableWrapper = styled.div`
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
      padding: 12px 16px;
      border-color: ${COLOR.GRAY_4};
    }
    .ant-table-row:last-child {
      .ant-table-cell {
        border-bottom: none;
      }
    }
    .ant-table-placeholder {
      .ant-table-cell {
        border-bottom: none;
      }
    }
  }
`;

export function Table<T extends Record<string, unknown>>(props: TableProps<T>) {
  return (
    <TableWrapper>
      <AntdTable<T> {...props} />
    </TableWrapper>
  );
}
