import {
  Button,
  Checkbox,
  Flex,
  Form as AntdForm,
  type FormProps,
  Input as AntdInput,
  message,
  Typography,
  UploadFile,
} from 'antd';
import { UploadChangeParam } from 'antd/es/upload';
import { useState } from 'react';
import { TbX } from 'react-icons/tb';
import styled, { css } from 'styled-components';
import { useUnmount } from 'usehooks-ts';

import { FormLabel, Modal, RequiredMark } from '@/components/ui';
import { COLOR } from '@/constants';
import { useElectronApi, useLogs } from '@/hooks';
import { ZendeskService } from '@/service/Zendesk';

import { FileUpload } from './FileUpload';

const { Text, Title } = Typography;

const MODAL_CONTENT_STYLES: React.CSSProperties = {
  maxHeight: 640,
  overflowY: 'auto',
  padding: 32,
};

const Form = styled(AntdForm)<FormProps<SupportModalFormValues>>`
  .ant-form-item-label {
    padding-bottom: 0;
  }

  .ant-checkbox-wrapper {
    height: max-content;
  }
`;

const inputStyles = css`
  background-color: ${COLOR.BACKGROUND};
  border-color: ${COLOR.GRAY_4};

  &:active,
  &:hover,
  &.ant-input-outlined:focus-within,
  &.ant-input-status-error {
    background-color: ${COLOR.BACKGROUND} !important;
  }

  &:hover {
    border-color: ${COLOR.PURPLE_LIGHT};
  }

  &:focus {
    border-color: ${COLOR.PRIMARY};
  }
`;

const Input = styled(AntdInput)`
  ${inputStyles}
`;

const TextArea = styled(AntdInput.TextArea)`
  ${inputStyles}
`;

const SupportModalHeader = ({ onClose }: { onClose: () => void }) => (
  <Flex vertical gap={8}>
    <Flex justify="space-between" align="center">
      <Title level={5} className="mt-0 mb-0">
        Contact Support
      </Title>
      <Button
        type="text"
        size="small"
        icon={<TbX size={16} />}
        onClick={onClose}
      />
    </Flex>
    <Text type="secondary" className="text-sm">
      Fill out the form below and the support team will get back to you via
      email. The team usually responses within 2 business days.
    </Text>
  </Flex>
);

const CheckboxLabel = () => (
  <Flex vertical gap={4} className="ml-4">
    <Text type="secondary" className="text-sm">
      Share Pearl app logs to help the support team solve this faster.
    </Text>
    <Text className="text-neutral-tertiary text-xs">
      * Logs don&apos;t contain any sensitive information and are collected for
      debugging purposes.
    </Text>
  </Flex>
);

type SupportModalFormValues = {
  email: string;
  subject: string;
  description: string;
  shouldShareLogs: boolean;
};

export const SupportModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const [form] = Form.useForm<SupportModalFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const { saveLogsForSupport, readFile, cleanupZendeskLogs } = useElectronApi();
  const logs = useLogs();

  const uploadLogs = async () => {
    if (!logs || !saveLogsForSupport || !readFile) return;

    try {
      // Save logs and get file path
      const result = await saveLogsForSupport(logs);
      if (!result.success) {
        throw new Error('Failed to save logs');
      }

      const { filePath } = result;
      const fileResult = await readFile(filePath);
      if (!fileResult.success) {
        throw new Error(fileResult.error || 'Failed to read file');
      }

      const uploadResult = await ZendeskService.uploadFile(fileResult);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload file');
      }

      return uploadResult.token;
    } catch (error) {
      console.error('Error preparing files for upload:', error);
      throw error;
    }
  };

  const handleSubmit = async (values: SupportModalFormValues) => {
    setIsSubmitting(true);
    try {
      const { email, subject, description, shouldShareLogs } = values;
      const logsUploadToken = shouldShareLogs ? await uploadLogs() : undefined;
      const createTicketResult = await ZendeskService.createTicket({
        email,
        subject,
        description,
        uploadTokens: logsUploadToken ? [logsUploadToken] : [],
      });
      if (!createTicketResult.success) {
        throw new Error(createTicketResult.error || 'Failed to create ticket');
      }
      await cleanupZendeskLogs?.();
      form.resetFields();
      setUploadedFiles([]);
      onClose();
    } catch (error) {
      message.error('Failed to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (info: UploadChangeParam<UploadFile>) => {
    setUploadedFiles(info.fileList);
  };

  useUnmount(() => {
    form.resetFields();
    setUploadedFiles([]);
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      size="large"
      hasCustomContent
      styles={{
        content: MODAL_CONTENT_STYLES,
      }}
    >
      <SupportModalHeader onClose={onClose} />

      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        className="mt-16"
        requiredMark={RequiredMark}
      >
        <Form.Item
          label={<FormLabel>Your email</FormLabel>}
          name="email"
          rules={[
            { required: true, message: 'Please enter your email!' },
            { type: 'email', message: 'Please enter a valid email!' },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={<FormLabel>Subject</FormLabel>}
          name="subject"
          rules={[{ required: true, message: 'Please enter a subject' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={<FormLabel>Describe the issue in detail</FormLabel>}
          name="description"
          rules={[{ required: true, message: 'Please describe your issue' }]}
          validateTrigger={['onChange', 'onBlur']}
          extra={
            <Text type="secondary" className="text-sm mt-4">
              If possible, outline the steps to reproduce your issue.
            </Text>
          }
        >
          <TextArea rows={4} />
        </Form.Item>

        <Form.Item
          label={<FormLabel>Attachments (optional)</FormLabel>}
          name="attachments"
        >
          <FileUpload onChange={handleFileChange} />
        </Form.Item>

        <Form.Item
          name="shouldShareLogs"
          valuePropName="checked"
          initialValue={true}
        >
          <Checkbox>
            <CheckboxLabel />
          </Checkbox>
        </Form.Item>

        <Form.Item className="mb-0">
          <Flex justify="end" gap={12}>
            <Button onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              Submit Issue
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  );
};
