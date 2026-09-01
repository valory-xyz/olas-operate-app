import { Flex, Form, FormInstance, Input, Typography } from 'antd';
import { ReactNode } from 'react';
import { LuCircleCheck, LuTriangleAlert } from 'react-icons/lu';
import zxcvbn from 'zxcvbn';

import { FormLabel } from '@/components/ui';
import { COLOR } from '@/constants';

import { PasswordStrength } from './PasswordForm';

const { Text } = Typography;

const NEW_PASSWORD_FIELD = 'newPassword';
const CONFIRM_PASSWORD_FIELD = 'confirmNewPassword';
const MIN_PASSWORD_LENGTH = 8;

/** Form values contributed by <PasswordSetupFields />. */
export type PasswordSetupFieldsValues = {
  newPassword: string;
  confirmNewPassword: string;
};

export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Your password must be at least 8 characters long. Use a mix of letters, numbers, and symbols.';

const isAscii = (value: string) => /^[\x20-\x7E]*$/.test(value);

type PasswordsState = 'match' | 'mismatch' | null;

type PasswordValidity = {
  isValid: boolean;
  passwordsState: PasswordsState;
  newPassword: string | undefined;
};

const isAsciiAndLongEnough = (value: string | undefined) =>
  !!value && value.length >= MIN_PASSWORD_LENGTH && isAscii(value);

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

type FieldCaptionProps = {
  text: ReactNode;
  color?: string;
  icon?: ReactNode;
};

/**
 * Single caption shape for every field state so toggling between states
 * never changes the row's height.
 */
const FieldCaption = ({ text, color, icon }: FieldCaptionProps) => (
  // `color` on the Flex tints the icon via currentColor; antd Typography sets
  // its own color, so the Text needs it explicitly as well.
  <Flex align="center" gap={6} className="mt-6" style={{ color }}>
    {icon}
    <Text style={{ color }} className="text-sm">
      {text}
    </Text>
  </Flex>
);

const ErrorCaption = ({ text }: { text: string }) => (
  <FieldCaption
    icon={<LuTriangleAlert />}
    color={COLOR.TEXT_COLOR.ERROR.DEFAULT}
    text={text}
  />
);

const getNewPasswordCaption = (
  value: string | undefined,
  isTouched: boolean,
): ReactNode => {
  if (!value) {
    return isTouched ? <ErrorCaption text="Please input a password." /> : null;
  }
  if (!isAscii(value)) {
    return <ErrorCaption text="Password must only contain ASCII characters." />;
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return (
      <ErrorCaption
        text={`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`}
      />
    );
  }
  return (
    <FieldCaption text={<PasswordStrength score={zxcvbn(value).score} />} />
  );
};

const getConfirmPasswordCaption = (
  passwordsState: PasswordsState,
  isEmptyAfterTouch: boolean,
): ReactNode => {
  if (passwordsState === 'match') {
    return (
      <FieldCaption
        icon={<LuCircleCheck />}
        color={COLOR.TEXT_COLOR.SUCCESS.DEFAULT}
        text="Passwords match"
      />
    );
  }
  if (passwordsState === 'mismatch') {
    return <ErrorCaption text="Passwords don't match" />;
  }
  if (isEmptyAfterTouch) {
    return <ErrorCaption text="Please confirm your password." />;
  }
  return null;
};

type PasswordSetupFieldsProps = {
  firstFieldLabel?: string;
  secondFieldLabel?: string;
};

/**
 * Shared "New password + Confirm new password" fields used by Settings'
 * UpdatePasswordScreen, the SRP-recovery SetNewPasswordViaSRP and the
 * signup SetupPassword. Renders the inputs plus a caption row per field
 * (required / length / ASCII / strength / match / mismatch).
 *
 * No antd validation rules are attached on purpose: every state is drawn
 * through `help` with the same `FieldCaption` shape (`required` below only
 * marks the labels with the asterisk). Parents must therefore gate submit
 * on `usePasswordSetupValidity().isValid`.
 */
export const PasswordSetupFields = ({
  firstFieldLabel = 'New password',
  secondFieldLabel = 'Confirm new password',
}: PasswordSetupFieldsProps = {}) => {
  const form = Form.useFormInstance();
  const newPassword = Form.useWatch(NEW_PASSWORD_FIELD, form);
  const confirmNewPassword = Form.useWatch(CONFIRM_PASSWORD_FIELD, form);

  // `isFieldTouched` is not reactive by itself; it is safe to read here only
  // because the `useWatch` calls above re-render on every value change and a
  // field becomes touched on its first change.
  const isNewPasswordTouched = form.isFieldTouched(NEW_PASSWORD_FIELD);
  const isNewPasswordInvalid =
    isNewPasswordTouched && !isAsciiAndLongEnough(newPassword);

  const passwordsState = derivePasswordsState(newPassword, confirmNewPassword);
  const isConfirmEmptyAfterTouch =
    !confirmNewPassword && form.isFieldTouched(CONFIRM_PASSWORD_FIELD);
  const isConfirmInvalid =
    passwordsState === 'mismatch' || isConfirmEmptyAfterTouch;

  return (
    <>
      <Form.Item
        name={NEW_PASSWORD_FIELD}
        required
        label={<FormLabel>{firstFieldLabel}</FormLabel>}
        help={getNewPasswordCaption(newPassword, isNewPasswordTouched)}
        labelCol={{ style: { paddingBottom: 4 } }}
        style={{ marginBottom: 0 }}
      >
        <Input.Password
          size="large"
          maxLength={64}
          status={isNewPasswordInvalid ? 'error' : undefined}
        />
      </Form.Item>

      <Form.Item
        name={CONFIRM_PASSWORD_FIELD}
        required
        label={<FormLabel>{secondFieldLabel}</FormLabel>}
        help={getConfirmPasswordCaption(
          passwordsState,
          isConfirmEmptyAfterTouch,
        )}
        labelCol={{ style: { paddingBottom: 4 } }}
        style={{ marginBottom: 0 }}
      >
        <Input.Password
          size="large"
          maxLength={64}
          status={isConfirmInvalid ? 'error' : undefined}
        />
      </Form.Item>
    </>
  );
};
