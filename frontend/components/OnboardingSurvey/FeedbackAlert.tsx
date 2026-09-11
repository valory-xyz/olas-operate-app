import { Button, Flex, Typography } from 'antd';
import { TbMessageDots } from 'react-icons/tb';

import { Alert } from '@/components/ui';
import { useOnboardingSurvey } from '@/hooks';

const { Text } = Typography;

/**
 * Sidebar alert for a questionnaire that was shown but never submitted.
 *
 * Same `Alert` as the backup-wallet and recovery-phrase alerts above it in the sidebar; the
 * `info` type carries the design's colours. Disappears on submission, and automatically once the
 * 2-week window lapses — both decided by `useOnboardingSurvey`, not here.
 */
export const FeedbackAlert = () => {
  const { showFeedbackAlert, open } = useOnboardingSurvey();

  if (!showFeedbackAlert) return null;

  return (
    <Alert
      type="info"
      showIcon
      customIcon={<TbMessageDots size={20} />}
      className="mb-16"
      message={
        <Flex vertical gap={10} align="flex-start">
          <Text className="text-sm">
            Tell the Pearl team how your setup went
          </Text>
          <Button size="small" onClick={open}>
            Give feedback
          </Button>
        </Flex>
      }
    />
  );
};
