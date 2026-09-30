import { Button, Flex, Typography } from 'antd';
import { TbSquareXFilled } from 'react-icons/tb';

import { COLOR } from '@/constants';
import { useSupportModal } from '@/context/SupportModalProvider';

const { Text } = Typography;

type FailureDetailsProps = {
  title: string;
  description: string[];
  onRetry: () => void;
  isRetrying: boolean;
  /** Right-aligned extra, e.g. the failure time. */
  extra?: string;
};

/** A failed row: what failed, why it is safe, and Retry / Contact Support. */
export const FailureDetails = ({
  title,
  description,
  onRetry,
  isRetrying,
  extra,
}: FailureDetailsProps) => {
  const { toggleSupportModal } = useSupportModal();

  return (
    <Flex gap={10} className="w-full">
      <TbSquareXFilled size={20} color={COLOR.ICON_COLOR.DANGER} />
      <Flex vertical gap={8} flex={1}>
        <Flex justify="space-between">
          <Text>{title}</Text>
          {extra && (
            <Text className="text-sm text-neutral-tertiary">{extra}</Text>
          )}
        </Flex>
        <Flex vertical>
          {description.map((line) => (
            <Text key={line} className="text-sm text-neutral-tertiary">
              {line}
            </Text>
          ))}
        </Flex>
        <Flex gap={8}>
          <Button
            type="primary"
            size="small"
            onClick={onRetry}
            loading={isRetrying}
          >
            Retry
          </Button>
          <Button size="small" onClick={toggleSupportModal}>
            Contact Support
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};
