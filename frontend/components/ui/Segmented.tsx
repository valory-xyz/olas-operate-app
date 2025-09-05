import { Segmented as AntdSegmented, SegmentedProps } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

const SegmentedWrapper = styled.div`
  .ant-segmented {
    border-radius: 12px;
    background-color: ${COLOR.WHITE};
  }

  .ant-segmented-item {
    background-color: ${COLOR.WHITE};
    border-radius: 12px;

    &.ant-segmented-item-selected {
      background-color: ${COLOR.GRAY_1};
    }
  }

  .ant-segmented-item-label {
    display: flex;
    padding: 8px 16px;
  }
`;

export const Segmented = ({ ...props }: SegmentedProps) => {
  return (
    <SegmentedWrapper>
      <AntdSegmented {...props} />
    </SegmentedWrapper>
  );
};
