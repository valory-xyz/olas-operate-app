import {
  Button,
  Flex,
  Form,
  Input,
  message,
  Typography,
  UploadFile,
} from 'antd';
import { UploadChangeParam } from 'antd/es/upload';
import { useState } from 'react';

import { Modal } from '@/components/ui';
import { useLogs } from '@/hooks';
import { useElectronApi } from '@/hooks/useElectronApi';
import { ZendeskService } from '@/service/Zendesk';

import { FileUpload } from './FileUpload';

const { Text, Title } = Typography;

export const SupportModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const { saveLogsForSupport, readFile } = useElectronApi();
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

  const handleSubmit = async (values: {
    email: string;
    subject: string;
    description: string;
  }) => {
    setIsSubmitting(true);
    try {
      const { email, subject, description } = values;
      const logsUploadToken = await uploadLogs();
      const createTicketResult = await ZendeskService.createTicket({
        email,
        subject,
        description,
        uploadTokens: logsUploadToken ? [logsUploadToken] : undefined,
      });
      if (!createTicketResult.success) {
        throw new Error(createTicketResult.error || 'Failed to create ticket');
      }
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

  return (
    <Modal open={open} onCancel={onClose} size="large" hasCustomContent>
      <Flex vertical gap={8}>
        <Title level={5} className="mb-0">
          Contact Support
        </Title>
        <Text type="secondary" className="text-sm">
          Fill out the form below and the support team will get back to you via
          email. The team usually responses within 2 business days.
        </Text>
      </Flex>

      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item
          label="Your email"
          name="email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input placeholder="your.email@example.com" />
        </Form.Item>

        <Form.Item
          label="Subject"
          name="subject"
          rules={[{ required: true, message: 'Please enter a subject' }]}
        >
          <Input placeholder="Brief description of your issue" />
        </Form.Item>

        <Form.Item
          label="Describe the issue in detail"
          name="description"
          rules={[{ required: true, message: 'Please describe your issue' }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Please provide as much detail as possible about the issue you're experiencing..."
          />
        </Form.Item>

        <Form.Item label="Attach files (optional)" name="attachments">
          <FileUpload onChange={handleFileChange} />
        </Form.Item>

        <Form.Item className="mb-0">
          <Flex justify="end" gap={8}>
            <Button onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              Submit Support Request
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  );
};
