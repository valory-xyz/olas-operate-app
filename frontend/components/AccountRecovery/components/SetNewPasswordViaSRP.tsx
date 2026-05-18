import { Button, Flex, Form, Typography } from 'antd';
import { useCallback, useState } from 'react';
import styled from 'styled-components';

import { SuccessOutlined, WarningOutlined } from '@/components/custom-icons';
import {
  Alert,
  BackButton,
  CardFlex,
  Modal,
  RequiredMark,
} from '@/components/ui';
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  PasswordSetupFields,
  usePasswordSetupValidity,
} from '@/components/ui/forms';
import { PAGES, SETUP_SCREEN } from '@/constants';
import { ERROR_CODE } from '@/constants/errors';
import { useSupportModal } from '@/context/SupportModalProvider';
import { usePageState, useSetup } from '@/hooks';
import { AccountService } from '@/service/Account';

import { useAccountRecoveryContext } from '../AccountRecoveryProvider';

const { Title, Text } = Typography;

const StyledCardFlex = styled(CardFlex)`
  max-width: 516px;
  margin: auto;
`;

const PasswordResetSuccessModal = ({ onDone }: { onDone: () => void }) => (
  <Modal
    header={<SuccessOutlined />}
    title="New Password Set Successfully!"
    description="You can now access your Pearl account with the new password."
    action={
      <Button
        type="primary"
        size="large"
        block
        className="mt-24"
        onClick={onDone}
      >
        Done
      </Button>
    }
  />
);

const PasswordResetFailedModal = ({
  onTryAgain,
  onContactSupport,
}: {
  onTryAgain: () => void;
  onContactSupport: () => void;
}) => (
  <Modal
    header={<WarningOutlined />}
    title="Password Update Failed"
    description="Please try again or contact Valory support."
    action={
      <Flex vertical gap={12} className="mt-24" style={{ width: '100%' }}>
        <Button type="primary" size="large" block onClick={onTryAgain}>
          Try Again
        </Button>
        <Button size="large" block onClick={onContactSupport}>
          Contact Support
        </Button>
      </Flex>
    }
  />
);

type SetNewPasswordFormValues = {
  newPassword: string;
  confirmNewPassword: string;
};

export const SetNewPasswordViaSRP = () => {
  const [form] = Form.useForm<SetNewPasswordFormValues>();
  const { isUserLoggedIn, goto: gotoPage } = usePageState();
  const { goto: gotoSetup } = useSetup();
  const { toggleSupportModal } = useSupportModal();
  const { srpMnemonic, setSrpMnemonic, setSrpError, onPrev } =
    useAccountRecoveryContext();
  const [resultModal, setResultModal] = useState<'success' | 'error' | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const exitFlow = useCallback(() => {
    // Clear the in-memory mnemonic and any banner state
    setSrpMnemonic(undefined);
    setSrpError(undefined);
    if (isUserLoggedIn) {
      gotoPage(PAGES.Main);
    } else {
      gotoSetup(SETUP_SCREEN.Welcome);
    }
  }, [isUserLoggedIn, gotoPage, gotoSetup, setSrpMnemonic, setSrpError]);

  // Back navigation within the recovery flow — drop the in-memory mnemonic
  // for the same security reason as exitFlow. srpError is left to the caller
  // (the invalid-mnemonic path intentionally sets it for the SRP banner).
  const goBack = useCallback(() => {
    setSrpMnemonic(undefined);
    onPrev();
  }, [setSrpMnemonic, onPrev]);

  const { isValid: isFormValid } = usePasswordSetupValidity(form);

  const handleSubmit = useCallback(
    async (values: SetNewPasswordFormValues) => {
      if (!srpMnemonic) return;
      setIsSubmitting(true);
      try {
        await AccountService.resetAccountWithMnemonic(
          srpMnemonic,
          values.newPassword,
        );

        setResultModal('success');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to reset account password';

        if (message.includes(ERROR_CODE.MSG_INVALID_MNEMONIC)) {
          setSrpError('Please review your input and try again.');
          goBack();
        } else {
          setResultModal('error');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [srpMnemonic, goBack, setSrpError],
  );

  return (
    <StyledCardFlex $gap={24} $noBorder>
      <Flex vertical gap={16}>
        <BackButton onPrev={goBack} />
        <Flex vertical gap={12}>
          <Title level={3} className="m-0">
            Set New Password
          </Title>
          <Text className="text-neutral-secondary">
            You will use this password to sign in to your Pearl account after
            the recovery process.
          </Text>
        </Flex>
      </Flex>

      <Alert
        type="info"
        showIcon
        message={PASSWORD_REQUIREMENTS_MESSAGE}
        className="text-sm"
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        requiredMark={RequiredMark}
      >
        <Flex vertical gap={24}>
          <PasswordSetupFields />

          <Form.Item style={{ marginBottom: 0 }}>
            <Flex gap={12}>
              <Button size="large" onClick={exitFlow}>
                Cancel
              </Button>
              <Button
                size="large"
                type="primary"
                htmlType="submit"
                disabled={!isFormValid}
                loading={isSubmitting}
                style={{ flex: 1 }}
              >
                Confirm Password
              </Button>
            </Flex>
          </Form.Item>
        </Flex>
      </Form>

      {resultModal === 'success' && (
        <PasswordResetSuccessModal
          onDone={() => {
            setResultModal(null);
            exitFlow();
          }}
        />
      )}

      {resultModal === 'error' && (
        <PasswordResetFailedModal
          onTryAgain={() => setResultModal(null)}
          onContactSupport={() => {
            setResultModal(null);
            toggleSupportModal();
          }}
        />
      )}
    </StyledCardFlex>
  );
};
