import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Row } from 'antd';
import { isFunction } from 'lodash';
import Image from 'next/image';
import { useCallback } from 'react';

import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

type SetupCreateHeaderProps = {
  prev?: SetupScreen | (() => void);
  disabled?: boolean;
};

/**
 *
 * @deprecated Use `AgentHeader` instead.
 */
export const SetupCreateHeader = ({ prev }: SetupCreateHeaderProps) => {
  const { goto } = useSetup();
  const handleBack = useCallback(() => {
    if (!prev) return;

    isFunction(prev) ? prev() : goto(prev);
  }, [goto, prev]);

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
