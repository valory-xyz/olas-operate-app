import { Flex, Form, FormInstance, Input, Typography } from 'antd';
import { Rule } from 'antd/es/form';
import { LuCircleCheck, LuTriangleAlert } from 'react-icons/lu';
import zxcvbn from 'zxcvbn';

import { FormLabel } from '@/components/ui';
import { COLOR } from '@/constants';

import { PasswordStrength } from './PasswordForm';

const { Text } = Typography;

const NEW_PASSWORD_FIELD = 'newPassword';
const CONFIRM_PASSWORD_FIELD = 'confirmNewPassword';
const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Your password must be at least 8 characters long. Use a mix of letters, numbers, and symbols.';

export const passwordAsciiRule: Rule = {
  validator: (_rule, value) => {
    if (!value) return Promise.resolve();
    if (!/^[\x20-\x7E]*$/.test(value)) {
      return Promise.reject(
        new Error('Password must only contain ASCII characters.'),
      );
    }
    return Promise.resolve();
  },
};

const newPasswordMinLengthRule: Rule = {
  min: MIN_PASSWORD_LENGTH,
  message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
};

const confirmPasswordMatchRule: Rule = ({ getFieldValue }) => ({
  validator: (_rule, value) => {
    if (!value || value === getFieldValue(NEW_PASSWORD_FIELD)) {
      return Promise.resolve();
    }
    return Promise.reject(new Error("Passwords don't match."));
  },
});

type PasswordsState = 'match' | 'mismatch' | null;

type PasswordValidity = {
  isValid: boolean;
  passwordsState: PasswordsState;
  newPassword: string | undefined;
};

const isAsciiAndLongEnough = (value: string | undefined) =>
  !!value &&
  value.length >= MIN_PASSWORD_LENGTH &&
  /^[\x20-\x7E]*$/.test(value);

const derivePasswordsState = (
  newPassword: string | undefined,
  confirm: string | undefined,
): PasswordsState => {
  if (!newPassword || !confirm) return null;
  return newPassword === confirm ? 'match' : 'mismatch';
};

/**
 * Derives the shared new-password + confirm-new-password validity for the
 * parent's CTA-gating. The companion <PasswordSetupFields /> renders the
 * inputs under the canonical field names `newPassword` / `confirmNewPassword`.
 */
export const usePasswordSetupValidity = (
  form: FormInstance,
): PasswordValidity => {
  const newPassword = Form.useWatch(NEW_PASSWORD_FIELD, form);
  const confirmNewPassword = Form.useWatch(CONFIRM_PASSWORD_FIELD, form);

  const passwordsState = derivePasswordsState(newPassword, confirmNewPassword);
  const isValid =
    isAsciiAndLongEnough(newPassword) && passwordsState === 'match';

  return { isValid, passwordsState, newPassword };
};

/**
 * Shared "New password + Confirm new password" fields used by Settings'
 * UpdatePasswordScreen and the SRP-recovery SetNewPasswordViaSRP. Renders
 * the inputs, strength indicator, match/mismatch caption, and error-border
 * on mismatch. Validation rules are enforced both via the CTA disabled
 * state and via antd Form rules so programmatic submits can't bypass them.
 */
export const PasswordSetupFields = () => {
  const newPassword = Form.useWatch(NEW_PASSWORD_FIELD);
  const confirmNewPassword = Form.useWatch(CONFIRM_PASSWORD_FIELD);

  const isNewPasswordValid = isAsciiAndLongEnough(newPassword);
  const passwordsState = derivePasswordsState(newPassword, confirmNewPassword);

  return (
    <>
      <Form.Item
        name={NEW_PASSWORD_FIELD}
        label={<FormLabel>New password</FormLabel>}
        rules={[
          { required: true, message: 'Please input a password.' },
          newPasswordMinLengthRule,
          passwordAsciiRule,
        ]}
        help={
          isNewPasswordValid ? (
            <div className="mt-6">
              <PasswordStrength score={zxcvbn(newPassword).score} />
            </div>
          ) : null
        }
        labelCol={{ style: { paddingBottom: 4 } }}
        style={{ marginBottom: 0 }}
      >
        <Input.Password size="large" maxLength={64} />
      </Form.Item>

      <Form.Item
        name={CONFIRM_PASSWORD_FIELD}
        label={<FormLabel>Confirm new password</FormLabel>}
        dependencies={[NEW_PASSWORD_FIELD]}
        rules={[
          { required: true, message: 'Please confirm your password.' },
          passwordAsciiRule,
          confirmPasswordMatchRule,
        ]}
        help={
          passwordsState === 'match' ? (
            <Flex align="center" gap={6} className="mt-6">
              <LuCircleCheck
                style={{ color: COLOR.TEXT_COLOR.SUCCESS.DEFAULT }}
              />
              <Text
                style={{ color: COLOR.TEXT_COLOR.SUCCESS.DEFAULT }}
                className="text-sm"
              >
                Passwords match
              </Text>
            </Flex>
          ) : passwordsState === 'mismatch' ? (
            <Flex align="center" gap={6} className="mt-6">
              <LuTriangleAlert
                style={{ color: COLOR.TEXT_COLOR.ERROR.DEFAULT }}
              />
              <Text
                style={{ color: COLOR.TEXT_COLOR.ERROR.DEFAULT }}
                className="text-sm"
              >
                Passwords don&apos;t match
              </Text>
            </Flex>
          ) : null
        }
        labelCol={{ style: { paddingBottom: 4 } }}
        style={{ marginBottom: 0 }}
      >
        <Input.Password
          size="large"
          maxLength={64}
          status={passwordsState === 'mismatch' ? 'error' : undefined}
        />
      </Form.Item>
    </>
  );
};
