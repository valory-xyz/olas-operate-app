import { LeftOutlined } from '@ant-design/icons';
import { Button as AntdButton, Flex } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

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
        icon={<LeftOutlined className="text-xs" />}
        type="text"
        className="text-light"
        size="small"
        style={{ paddingLeft: 4 }}
      >
        Back
      </Button>
    )}
  </Flex>
);
