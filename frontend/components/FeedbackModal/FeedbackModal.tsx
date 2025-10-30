import {
  Button,
  Flex,
  Form as AntdForm,
  FormProps,
  message,
  Rate as AntdRate,
  Typography,
} from 'antd';
import { Rule } from 'antd/es/form';
import { useState } from 'react';
import { TbX } from 'react-icons/tb';
import styled from 'styled-components';

import {
  FormLabel,
  Input,
  Modal,
  RequiredMark,
  TextArea,
} from '@/components/ui';
import { COLOR } from '@/constants';
import { ZendeskService } from '@/service/Zendesk';

const { Title } = Typography;

const VALIDATION_RULES: { [key: string]: Rule[] } = {
  EMAIL: [{ type: 'email', message: 'Please enter a valid email!' }],
  RATING: [{ required: true, message: 'Please rate your experience!' }],
  FEEDBACK: [{ required: true, message: 'Please describe your feedback!' }],
};

const MODAL_CONTENT_STYLES: React.CSSProperties = {
  padding: 32,
};

const Form = styled(AntdForm)<FormProps<FeedbackModalFormValues>>`
  .ant-form-item-label {
    padding-bottom: 0;
  }
`;

const Rate = styled(AntdRate)`
  color: ${COLOR.PRIMARY};

  &.ant-rate {
    .ant-rate-star-zero .ant-rate-star-first,
    .ant-rate-star-zero .ant-rate-star-second {
      color: ${COLOR.GRAY_3};
    }
  }
`;

const ModalHeader = ({ onClose }: { onClose: () => void }) => (
  <Flex justify="space-between" align="center" className="mb-24">
    <Title level={5} className="m-0">
      Share Feedback
    </Title>
    <Button
      type="text"
      size="small"
      icon={<TbX size={16} />}
      onClick={onClose}
    />
  </Flex>
);

type FeedbackModalFormValues = {
  email?: string;
  rating: number;
  feedback: string;
};

export const FeedbackModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const [form] = Form.useForm<FeedbackModalFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { email, rating, feedback } = form.getFieldsValue();
      const createTicketResult = await ZendeskService.createTicket({
        email: email === '' ? undefined : email,
        subject: 'Pearl Feedback',
        description: feedback,
        rating: rating.toString(),
        tags: ['pearl', 'feedback', `rating:${rating}`],
      });

      if (!createTicketResult.success) {
        message.error('Failed to submit feedback. Please try again.');
        return;
      }

      message.success('Feedback submitted successfully!');
    } finally {
      setIsSubmitting(false);
      handleClose();
    }
  };

  const handleClose = () => {
    form.resetFields();
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      hasCustomContent
      styles={{
        content: MODAL_CONTENT_STYLES,
      }}
    >
      <ModalHeader onClose={handleClose} />

      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        requiredMark={RequiredMark}
      >
        <Form.Item
          name="email"
          label={<FormLabel>Your email - optional</FormLabel>}
          rules={VALIDATION_RULES.EMAIL}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="rating"
          label={<FormLabel>Rate your experience with Pearl</FormLabel>}
          rules={VALIDATION_RULES.RATING}
        >
          <Rate allowHalf={false} allowClear={false} />
        </Form.Item>

        <Form.Item
          name="feedback"
          label={<FormLabel>Describe your feedback</FormLabel>}
          rules={VALIDATION_RULES.FEEDBACK}
        >
          <TextArea rows={4} />
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
