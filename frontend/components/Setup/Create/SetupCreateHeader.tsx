import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Row } from 'antd';
import Image from 'next/image';
import { memo } from 'react';

import { SetupScreen } from '@/enums';
import { useSetup } from '@/hooks';

export const SetupCreateHeader = memo(function SetupCreateHeader({
  prev,
  disabled = false,
}: {
  prev: SetupScreen;
  disabled?: boolean;
}) {
  const { goto } = useSetup();
  const handleBack = () => goto(prev);
  return (
    <Row>
      <Col span={8}>
        <Button
          onClick={handleBack}
          disabled={disabled}
          icon={<ArrowLeftOutlined />}
          size="large"
        />
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
});
