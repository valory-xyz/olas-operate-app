import { LeftOutlined } from '@ant-design/icons';
import { Button, Flex } from 'antd';

type AgentHeaderV1Props = {
  onPrev?: () => void;
};

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
        className="text-light back-button"
        size="small"
        style={{ paddingLeft: 4 }}
      >
        Back
      </Button>
    )}
  </Flex>
);
