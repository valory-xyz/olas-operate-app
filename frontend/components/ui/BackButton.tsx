import { LeftOutlined } from '@ant-design/icons';
import { Button as AntdButton, Flex } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants';

type AgentHeaderV1Props = {
  onPrev?: () => void;
};

const Button = styled(AntdButton)`
  font-size: 16px;
  color: ${COLOR.TEXT_NEUTRAL_TERTIARY} !important;
`;

/**
 * Displays a header for the agent which includes a back button.
 */
export const BackButton = ({ onPrev }: AgentHeaderV1Props) => (
  <Flex>
    {onPrev && (
      <Button
        onClick={() => onPrev()}
        type="text"
        size="small"
        style={{ paddingLeft: 4 }}
      >
        <LeftOutlined className="text-xs" /> Back
      </Button>
    )}
  </Flex>
);
