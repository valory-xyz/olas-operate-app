import { CloseOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Form, Input, Row, Tooltip, Typography } from 'antd';
import isEmpty from 'lodash/isEmpty';
import { memo, useMemo, useState } from 'react';

import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

const ExitButton = memo(function ExitButton() {
  const { goto } = useSetup();
  return (
    <Button size="large" onClick={() => goto(SetupScreen.Welcome)}>
      <CloseOutlined />
    </Button>
  );
});

export const SetupRestoreMain = () => {
  const { goto } = useSetup();
  return (
    <CardFlex
      title={
        <Flex justify="space-between" align="center">
          <Typography.Title className="m-0" level={4}>
            Restore access
          </Typography.Title>
          <ExitButton />
        </Flex>
      }
    >
      <CardSection gap={10} vertical bordertop="true" borderbottom="true">
        <Typography.Text>
          You can recover the Pearl account access by providing the seed phrase
          you received when setting up your account.
        </Typography.Text>
        <Tooltip title="Seed phrase account recovery coming soon.">
          <Button
            disabled // seed phrase recovery is not yet implemented
            size="large"
            type="primary"
            className="w-3/4"
            onClick={() => goto(SetupScreen.RestoreViaSeed)}
          >
            Restore account via seed phrase
          </Button>
        </Tooltip>
      </CardSection>
      <CardSection gap={10} vertical bordertop="true" borderbottom="true">
        <Typography.Text>
          If you don’t have the seed phrase but added a backup wallet to your
          account, you may still restore your funds, but you won’t be able to
          recover access to your Pearl account.
        </Typography.Text>
        <Button
          size="large"
          className="w-3/4"
          onClick={() => goto(SetupScreen.RestoreViaBackup)}
        >
          Restore funds via backup wallet
        </Button>
      </CardSection>
    </CardFlex>
  );
};

const SEED_PHRASE_WORDS = 12;
export const SetupRestoreViaSeed = () => {
  const { goto } = useSetup();

  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<{ [name: string]: string }>({});

  const onValuesChange = (
    changedValues: { [name: string]: string },
    allValues: { [name: string]: string },
  ) => setFormValues(allValues);

  const isComplete = useMemo(
    () =>
      !isEmpty(formValues) &&
      Object.values(formValues).every((v: string) => v && v.trim()),
    [formValues],
  );

  return (
    <CardFlex
      title={
        <Flex justify="space-between" align="center">
          <Typography.Title className="m-0" level={4}>
            Restore via seed phrase
          </Typography.Title>
          <ExitButton />
        </Flex>
      }
    >
      <Flex gap={24} vertical>
        <Typography.Text>
          To restore access to your Pearl account, enter the seed phrase you
          received when setting up your account.
        </Typography.Text>
        <Form form={form} onValuesChange={onValuesChange}>
          <Flex vertical gap={24}>
            <Row gutter={10}>
              {[...new Array(SEED_PHRASE_WORDS)].map((_, i) => (
                <Col span={12} key={i}>
                  <Form.Item name={`${i + 1}`}>
                    <Input
                      prefix={`${i + 1}. `}
                      size="large"
                      className="w-full text-base"
                    />
                  </Form.Item>
                </Col>
              ))}
            </Row>
            <Button
              disabled={!isComplete}
              htmlType="submit"
              onClick={() => goto(SetupScreen.RestoreSetPassword)}
              size="large"
              type="primary"
            >
              Continue
            </Button>
          </Flex>
        </Form>
      </Flex>
    </CardFlex>
  );
};

export const SetupRestoreSetPassword = () => {
  const { goto } = useSetup();
  const [password, setPassword] = useState('');
  return (
    <CardFlex
      title={
        <Flex justify="space-between" align="center">
          <Typography.Title className="m-0" level={4}>
            Set password
          </Typography.Title>
          <ExitButton />
        </Flex>
      }
    >
      <Flex gap={24} vertical>
        <Typography.Text>
          Come up with a strong password to get access to the Pearl account in
          the future.
        </Typography.Text>
        <Flex vertical gap={16}>
          <Input.Password
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            size="large"
            value={password}
          />
          <Button
            size="large"
            type="primary"
            onClick={() => goto(SetupScreen.Welcome)}
          >
            Set password
          </Button>
        </Flex>
      </Flex>
    </CardFlex>
  );
};

export const SetupRestoreViaBackup = () => {
  return (
    <CardFlex
      title={
        <Flex justify="space-between" align="center">
          <Typography.Title className="m-0" level={4}>
            Set password
          </Typography.Title>
          <ExitButton />
        </Flex>
      }
    >
      <Flex vertical gap={10}>
        <Typography.Text>
          To restore access to the funds in your Pearl account, please follow
          the instructions below.
        </Typography.Text>
        <Typography.Text>
          Note that the backup wallet feature is not designed to restore access
          to your Pearl account but rather the funds stored on it.
        </Typography.Text>
      </Flex>
    </CardFlex>
  );
};
