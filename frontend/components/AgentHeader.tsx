import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Row } from 'antd';
import Image from 'next/image';
import { useCallback } from 'react';

type AgentHeaderProps = {
  prev?: () => void;
  disabled?: boolean;
};

/**
 *
 * Displays the header for the agent onboarding process.
 * It includes a back button if a previous action is provided,
 * and a centered image representing the onboarding robot.
 */
export const AgentHeader = ({ prev }: AgentHeaderProps) => {
  const handleBack = useCallback(() => {
    prev?.();
  }, [prev]);

  return (
    <Row>
      <Col span={8}>
        {prev && (
          <Button
            onClick={handleBack}
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
