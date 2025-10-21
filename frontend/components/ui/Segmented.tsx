import { Segmented as AntdSegmented, SegmentedProps } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { ValueOf } from '@/types/Util';

const SegmentedWrapper = styled.div<{ $activeIconColored?: boolean }>`
  .ant-segmented {
    border-radius: 12px;
    background-color: ${COLOR.WHITE};
    overflow: hidden;
    border: 2px solid white;
    box-shadow:
      0 35px 10px 0 rgba(170, 193, 203, 0),
      0 23px 9px 0 rgba(170, 193, 203, 0.01),
      0 13px 8px 0 rgba(170, 193, 203, 0.05),
      0 6px 6px 0 rgba(170, 193, 203, 0.09),
      0 1px 3px 0 rgba(170, 193, 203, 0.1);

    .ant-segmented-thumb {
      background-color: ${COLOR.GRAY_1};
    }
  }

  .ant-segmented-item {
    background-color: transparent;
    border-radius: 12px;

    .ant-segmented-item-label {
      display: flex;
      padding: 8px 16px;
      line-height: 1.5;
      color: ${COLOR.TEXT_NEUTRAL_TERTIARY};

      .ant-segmented-item-icon {
        align-items: center;
        display: flex;
      }
    }

    &.ant-segmented-item-selected {
      background-color: ${COLOR.GRAY_1};

      .ant-segmented-item-label {
        color: ${COLOR.TEXT_NEUTRAL_PRIMARY};

        .ant-segmented-item-icon {
          color: ${({ $activeIconColored }) =>
            $activeIconColored ? COLOR.PURPLE : 'inherit'};
        }
      }
    }
  }
`;

type SegmentedExtraProps = { activeIconColored?: boolean };

export function Segmented<
  T extends ValueOf<SegmentedProps<T>> & { className?: string },
>({
  className,
  activeIconColored,
  ...rest
}: SegmentedProps<T> & SegmentedExtraProps) {
  return (
    <SegmentedWrapper
      className={className}
      $activeIconColored={activeIconColored}
    >
      <AntdSegmented<T> {...rest} />
    </SegmentedWrapper>
  );
}
