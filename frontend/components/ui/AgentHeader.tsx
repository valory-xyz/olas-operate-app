import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Row } from 'antd';
import Image from 'next/image';

type AgentHeaderProps = {
  onPrev?: () => void;
};

/**
 * Displays the header for the agent which includes a back button
 * if a previous action is provided, and a centered image representing the onboarding robot.
 */
export const AgentHeader = ({ onPrev }: AgentHeaderProps) => {
  return (
    <Row>
      <Col span={8}>
        {onPrev && (
          <Button
            onClick={() => onPrev()}
            icon={<ArrowLeftOutlined />}
            size="large"
          />
        )}
      </Col>

      <Col span={8}>
        <Flex justify="center">
          <Image
            src="/onboarding-robot.svg"
            alt="logo"
            width={80}
            height={80}
          />
        </Flex>
      </Col>

      <Col span={8} />
    </Row>
  );
};
