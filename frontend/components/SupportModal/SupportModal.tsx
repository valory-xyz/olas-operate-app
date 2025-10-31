import {
  Button,
  Checkbox,
  Flex,
  Form as AntdForm,
  type FormProps,
  Input,
  message,
  Typography,
  UploadFile,
} from 'antd';
import type { Rule } from 'antd/es/form';
import { UploadChangeParam } from 'antd/es/upload';
import { delay } from 'lodash';
import { useCallback, useState } from 'react';
import { TbX } from 'react-icons/tb';
import styled from 'styled-components';

import { FormLabel, Modal, RequiredMark } from '@/components/ui';
import { useElectronApi } from '@/hooks';
import { SupportService } from '@/service/Support';

import { SuccessOutlined } from '../custom-icons';
import { FileUploadWithList } from './FileUpload';
import { useUploadSupportFiles } from './useUploadSupportFiles';

const { Text } = Typography;

const VALIDATION_RULES: { [key: string]: Rule[] } = {
  EMAIL: [
    { required: true, type: 'email', message: 'Please enter a valid email!' },
  ],
  SUBJECT: [{ required: true, message: 'Please enter a subject!' }],
  DESCRIPTION: [{ required: true, message: 'Please describe your issue!' }],
} as const;

const SUPPORT_TAGS = ['pearl', 'support'] as const;

const MODAL_CONTENT_STYLES: React.CSSProperties = {
  maxHeight: 640,
  overflowY: 'auto',
  padding: 32,
};

const Form = styled(AntdForm)<FormProps<SupportModalFormValues>>`
  .ant-form-item-label {
    padding-bottom: 0;
  }
`;

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

  const [form] = Form.useForm<SupportModalFormValues>();
  const { cleanupSupportLogs } = useElectronApi();
  const { uploadFiles } = useUploadSupportFiles();

  const handleSubmit = useCallback(
    async (values: SupportModalFormValues) => {
      setIsSubmitting(true);
      try {
        const { email, subject, description, shouldShareLogs } = values;

        const uploadTokens = await uploadFiles(uploadedFiles, shouldShareLogs);
        const createTicketResult = await SupportService.createTicket({
          email,
          subject,
          description,
          uploadTokens,
          tags: [...SUPPORT_TAGS],
        });

        if (!createTicketResult.success) {
          throw new Error(createTicketResult.error);
        }

        setTicketId(createTicketResult.ticketId);
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : 'Failed to submit support request. Please try again.',
        );
      } finally {
        await cleanupSupportLogs?.();
        setIsSubmitting(false);
      }
    },
    [uploadFiles, uploadedFiles, cleanupSupportLogs],
  );

  const resetFormFields = () => {
    form.resetFields();
    setUploadedFiles([]);
  };

  const handleFileChange = (info: UploadChangeParam<UploadFile>) => {
    setUploadedFiles(info.fileList);
  };

  const handleClose = () => {
    resetFormFields();
    setIsSubmitting(false);
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
      destroyOnHidden
      styles={{
        content: MODAL_CONTENT_STYLES,
      }}
      closable
      closeIcon={<TbX size={16} />}
      title="Contact Support"
      action={
        <>
          <Text type="secondary" className="text-sm mt--4">
            Fill out the form below and the support team will get back to you
            via email. The team usually responds within 2 business days.
          </Text>

          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            className="mt-16 w-full"
            requiredMark={RequiredMark}
          >
            <Form.Item
              label={<FormLabel>Your email</FormLabel>}
              name="email"
              rules={VALIDATION_RULES.EMAIL}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label={<FormLabel>Subject</FormLabel>}
              name="subject"
              rules={VALIDATION_RULES.SUBJECT}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label={<FormLabel>Describe the issue in detail</FormLabel>}
              name="description"
              rules={VALIDATION_RULES.DESCRIPTION}
              extra={
                <Text type="secondary" className="text-sm mt-4">
                  If possible, outline the steps to reproduce your issue.
                </Text>
              }
            >
              <Input.TextArea rows={4} />
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
        </>
      }
    />
  );
};
