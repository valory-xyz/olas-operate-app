import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Popover, Typography } from 'antd';

import { COLOR } from '@/constants/colors';

const LOADING_MESSAGE =
  "Starting the agent may take a while, so feel free to minimize the app. We'll notify you once it's running. Please, don't quit the app.";

export const AgentStartingButton = () => (
  <Popover
    trigger={['hover', 'click']}
    placement="bottomLeft"
    showArrow={false}
    content={
      <Flex vertical={false} gap={8} style={{ maxWidth: 260 }}>
        <Typography.Text>
          <InfoCircleOutlined style={{ color: COLOR.BLUE }} />
        </Typography.Text>
        <Typography.Text>{LOADING_MESSAGE}</Typography.Text>
      </Flex>
    }
  >
    <Button type="default" size="large" ghost disabled loading>
      Starting...
    </Button>
  </Popover>
);
