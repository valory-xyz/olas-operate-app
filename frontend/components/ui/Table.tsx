import { Table as AntdTable, TableProps } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

const TableWrapper = styled.div<{ $noBorder?: boolean }>`
  .ant-table-container {
    border-bottom-left-radius: ${({ $noBorder }) =>
      $noBorder ? undefined : '8px'};
  }

  .ant-table-thead {
    .ant-table-cell {
      padding: 10px 16px;
      border-bottom: ${({ $noBorder }) => ($noBorder ? 'none' : undefined)};
      font-weight: 400;
      font-size: 14px;
      color: ${COLOR.TEXT_NEUTRAL_TERTIARY};
      background-color: ${COLOR.BACKGROUND};

      &:first-child {
        border-top-left-radius: 8px;
        border-bottom-left-radius: ${({ $noBorder }) =>
          $noBorder ? '8px' : '0'};
      }

      &:last-child {
        border-top-right-radius: 8px;
        border-bottom-right-radius: ${({ $noBorder }) =>
          $noBorder ? '8px' : '0'};
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
        border-bottom: ${({ $noBorder }) => ($noBorder ? 'none' : undefined)};
        &:first-child {
          border-bottom-left-radius: ${({ $noBorder }) =>
            $noBorder ? undefined : '8px'};
        }

        &:last-child {
          border-bottom-right-radius: ${({ $noBorder }) =>
            $noBorder ? undefined : '8px'};
        }
      }
    }
    .ant-table-placeholder {
      .ant-table-cell {
        border-bottom: ${({ $noBorder }) => ($noBorder ? 'none' : undefined)};
      }
    }
  }
`;

type CustomTableProps<T> = TableProps<T> & {
  $noBorder?: boolean;
};

export function Table<T extends Record<string, unknown>>({
  $noBorder = true,
  ...props
}: CustomTableProps<T>) {
  return (
    <TableWrapper $noBorder={$noBorder}>
      <AntdTable<T> {...props} />
    </TableWrapper>
  );
}
