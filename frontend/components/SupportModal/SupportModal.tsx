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
import { delay } from 'lodash';
import { useState } from 'react';
import { TbX } from 'react-icons/tb';
import styled, { css } from 'styled-components';

import { FormLabel, Modal, RequiredMark } from '@/components/ui';
import { COLOR } from '@/constants';
import { useElectronApi, useLogs } from '@/hooks';
import { ZendeskService } from '@/service/Zendesk';

import { SuccessOutlined } from '../custom-icons';
import { FileUploadWithList } from './FileUpload';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [ticketId, setTicketId] = useState<number | null>(null);

  const logs = useLogs();
  const [form] = Form.useForm<SupportModalFormValues>();
  const { saveLogsForSupport, readFile, cleanupZendeskLogs } = useElectronApi();

  const formatAttachments = async (): Promise<
    Array<{
      fileName: string;
      fileContent: string;
      mimeType: string;
    }>
  > => {
    if (uploadedFiles.length === 0) return [];

    const filePromises = uploadedFiles.map(
      (
        file,
      ): Promise<{
        fileName: string;
        fileContent: string;
        mimeType: string;
      } | null> => {
        const fileObj = file.originFileObj;
        if (!fileObj) return Promise.resolve(null);

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              resolve({
                fileName: file.name,
                fileContent: reader.result as string,
                mimeType: file.type || 'application/octet-stream',
              });
            } catch (error) {
              reject(new Error(`Failed to process file ${file.name}`));
            }
          };
          reader.onerror = () => {
            reject(new Error(`Failed to read file ${file.name}`));
          };
          reader.readAsDataURL(fileObj);
        });
      },
    );

    return Promise.all(filePromises).then(
      (results) =>
        results.filter(Boolean) as {
          fileName: string;
          fileContent: string;
          mimeType: string;
        }[],
    );
  };

  const loadLogsFile = async (): Promise<{
    fileName: string;
    fileContent: string;
    mimeType: string;
  } | null> => {
    if (!logs || !saveLogsForSupport || !readFile) return null;

    const result = await saveLogsForSupport(logs);
    if (!result.success) {
      throw new Error('Failed to save logs');
    }

    const fileResult = await readFile(result.filePath);
    if (!fileResult.success) {
      throw new Error(fileResult.error || 'Failed to read file');
    }

    return fileResult;
  };

  const uploadFiles = async (shouldIncludeLogs: boolean): Promise<string[]> => {
    const [attachments, logsFile] = await Promise.all([
      formatAttachments(),
      shouldIncludeLogs
        ? loadLogsFile().catch(() => null)
        : Promise.resolve(null),
    ]);

    const allFiles = [...attachments, ...(logsFile ? [logsFile] : [])];

    return Promise.all(
      allFiles.map(async (file) => {
        const result = await ZendeskService.uploadFile(file);
        if (!result.success) {
          throw new Error(result.error || `Failed to upload ${file.fileName}`);
        }
        return result.token;
      }),
    );
  };

  const handleSubmit = async (values: SupportModalFormValues) => {
    setIsSubmitting(true);
    try {
      const { email, subject, description, shouldShareLogs } = values;

      const uploadTokens = await uploadFiles(shouldShareLogs);
      const createTicketResult = await ZendeskService.createTicket({
        email,
        subject,
        description,
        uploadTokens,
      });

      if (!createTicketResult.success) {
        throw new Error(createTicketResult.error || 'Failed to create ticket');
      }

      await cleanupZendeskLogs?.();
      setTicketId(createTicketResult.ticketId);
    } catch (error) {
      message.error('Failed to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormFields = () => {
    form.resetFields();
    setUploadedFiles([]);
  };

  const handleFileChange = (info: UploadChangeParam<UploadFile>) => {
    setUploadedFiles(info.fileList);
  };

  const handleClose = () => {
    resetFormFields();
    onClose();

    if (ticketId) {
      // Delay to ensure that we don't switch to the main modal while closing.
      delay(() => setTicketId(null), 250);
    }
  };

  if (ticketId) {
    return (
      <Modal
        open={open}
        onCancel={handleClose}
        header={<SuccessOutlined />}
        title="Request Submitted!"
        description={`Your request ID is #${ticketId}. Keep an eye on your inbox for the response from the support team.`}
        action={
          <Button type="primary" onClick={handleClose} block className="mt-32">
            Close
          </Button>
        }
      />
    );
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
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
          <FileUploadWithList
            onChange={handleFileChange}
            uploadedFiles={uploadedFiles}
          />
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
            <Button onClick={handleClose} disabled={isSubmitting}>
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
