import { Flex, Form } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { PasswordForm } from '@/components/ui';

import { useAccountRecoveryContext } from '../AccountRecoveryProvider';

const PasswordContainer = styled(Flex)`
  .ant-card {
    width: 480px;
  }
`;

export const CreateNewPassword = () => {
  const { onPrev, onNext } = useAccountRecoveryContext();
  const [form] = Form.useForm<{ password: string }>();
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const password = Form.useWatch('password', form);

  useEffect(() => {
    if (password) {
      form
        .validateFields(['password'])
        .then(() => setIsPasswordValid(true))
        .catch(() => setIsPasswordValid(false));
    } else {
      setIsPasswordValid(false);
    }
  }, [password, form]);

  const handleFinish = useCallback(
    (values: { password: string }) => {
      window.console.log(values); // MAKE AN API TO "/prepare"
      onNext();
    },
    [onNext],
  );

  return (
    <PasswordContainer align="center" justify="center" className="w-full mt-40">
      <PasswordForm
        form={form}
        isPasswordValid={isPasswordValid}
        onFinish={handleFinish}
        onBack={onPrev}
        isSubmitting={false}
        title="Set New Password"
        info="You will use this password to sign in to your Pearl account after the recovery process."
      />
    </PasswordContainer>
  );
};
