import { LeftOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

type AgentHeaderV1Props = {
  onPrev?: () => void;
};

const CustomButton = styled(Button)`
  font-size: 16px;
  color: ${COLOR.TEXT_NEUTRAL_TERTIARY} !important;
`;

/**
 * Displays a header for the agent which includes a back button.
 */
export const BackButton = ({ onPrev }: AgentHeaderV1Props) => (
  <Flex>
    {onPrev && (
      <CustomButton
        onClick={() => onPrev()}
        icon={<LeftOutlined className="text-xs" />}
        type="text"
        className="text-light"
        size="small"
        style={{ paddingLeft: 4 }}
      >
        Back
      </CustomButton>
    )}
  </Flex>
);
