import { useMutation } from '@tanstack/react-query';
import { Flex, Form } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { PasswordForm } from '@/components/ui';
import { useMessageApi } from '@/context/MessageProvider';
import { RecoveryService } from '@/service/Recovery';
import { getErrorMessage } from '@/utils';

import { useAccountRecoveryContext } from '../AccountRecoveryProvider';

const PasswordContainer = styled(Flex)`
  .ant-card {
    width: 480px;
  }
`;

export const CreateNewPassword = () => {
  const message = useMessageApi();
  const { onPrev, onNext, updateNewMasterEoaAddress } =
    useAccountRecoveryContext();
  const [form] = Form.useForm<{ password: string }>();
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const password = Form.useWatch('password', form);

  const { isPending, mutateAsync: prepareRecoveryProcess } = useMutation({
    mutationFn: async (password: string) =>
      await RecoveryService.prepareRecovery(password),
  });

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
    async (values: { password: string }) => {
      try {
        const { wallets } = await prepareRecoveryProcess(values.password);
        const newMasterEoaAddress = wallets[0].new_wallet.address;
        const oldMasterEoaAddress = wallets[0].current_wallet.address;
        updateNewMasterEoaAddress(newMasterEoaAddress, oldMasterEoaAddress);
        onNext();
      } catch (error) {
        message.error(getErrorMessage(error));
      }
    },
    [onNext, prepareRecoveryProcess, updateNewMasterEoaAddress, message],
  );

  return (
    <PasswordContainer align="center" justify="center" className="w-full mt-40">
      <PasswordForm
        form={form}
        isSubmitting={isPending}
        isPasswordValid={isPasswordValid}
        onFinish={handleFinish}
        onBack={onPrev}
        title="Set New Password"
        info="You will use this password to sign in to your Pearl account after the recovery process."
        label="Enter new password"
      />
    </PasswordContainer>
  );
};
