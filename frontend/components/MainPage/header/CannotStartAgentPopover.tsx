import { InfoCircleOutlined } from '@ant-design/icons';
import { Flex, Popover, PopoverProps, Typography } from 'antd';

import { COLOR } from '@/constants/colors';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';
import {
  useActiveStakingContractDetails,
  useStakingContractContext,
  useStakingContractDetails,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { formatToShortDateTime } from '@/utils/time';

const { Paragraph, Text } = Typography;

const cannotStartAgentText = (
  <Text style={{ color: COLOR.RED }}>
    Cannot start agent&nbsp;
    <InfoCircleOutlined />
  </Text>
);

const otherPopoverProps: PopoverProps = {
  arrow: false,
  placement: 'bottomRight',
};

export const CannotStartAgentDueToUnexpectedError = () => (
  <Popover
    {...otherPopoverProps}
    title="Unexpected error"
    content={
      <div style={{ maxWidth: 340 }}>
        <Paragraph>
          Try to restart the app. If the issue persists, join the Olas community
          Discord server to report or stay up to date on the issue.
        </Paragraph>

        <a href={SUPPORT_URL} target="_blank" rel="noreferrer">
          Olas community Discord server {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>
      </div>
    }
  >
    {cannotStartAgentText}
  </Popover>
);

const evictedDescription =
  "You didn't run your agent enough and it missed its targets multiple times. You can run the agent again when the eviction period ends.";
const AgentEvictedPopover = () => {
  const { isAllStakingContractDetailsRecordLoaded } =
    useStakingContractContext();

  const { evictionExpiresAt } = useActiveStakingContractDetails();

  if (!isAllStakingContractDetailsRecordLoaded) return null;

  return (
    <Popover
      {...otherPopoverProps}
      title="Your agent is evicted"
      content={
        <Flex
          vertical
          gap={8}
          className="text-sm-all"
          style={{ maxWidth: 340 }}
        >
          <Paragraph className="text-sm m-0">{evictedDescription}</Paragraph>
          {evictionExpiresAt && (
            <Paragraph className="m-0">
              <Text className="text-sm">Eviction ends at</Text>{' '}
              <Text strong className="text-sm">
                {formatToShortDateTime(evictionExpiresAt * 1000)} (UTC)
              </Text>
            </Paragraph>
          )}
        </Flex>
      }
    >
      {cannotStartAgentText}
    </Popover>
  );
};

const JoinOlasCommunity = () => (
  <div style={{ maxWidth: 340 }}>
    <Paragraph>
      Join the Olas community Discord server to report or stay up to date on the
      issue.
    </Paragraph>

    <a href={SUPPORT_URL} target="_blank" rel="noreferrer">
      Olas community Discord server {UNICODE_SYMBOLS.EXTERNAL_LINK}
    </a>
  </div>
);

const NoRewardsAvailablePopover = () => (
  <Popover
    {...otherPopoverProps}
    title="No rewards available"
    content={<JoinOlasCommunity />}
  >
    {cannotStartAgentText}
  </Popover>
);

const NoJobsAvailablePopover = () => (
  <Popover
    {...otherPopoverProps}
    title="No jobs available"
    content={<JoinOlasCommunity />}
  >
    {cannotStartAgentText}
  </Popover>
);

export const CannotStartAgentPopover = () => {
  const { isAllStakingContractDetailsRecordLoaded } =
    useStakingContractContext();

  const { activeStakingProgramId } = useStakingProgram();

  const { isAgentEvicted, isEligibleForStaking } =
    useActiveStakingContractDetails();

  const { hasEnoughServiceSlots, isRewardsAvailable } =
    useStakingContractDetails(activeStakingProgramId);

  if (!isAllStakingContractDetailsRecordLoaded) return null;
  if (isEligibleForStaking) return null;
  if (!hasEnoughServiceSlots) return <NoJobsAvailablePopover />;
  if (!isRewardsAvailable) return <NoRewardsAvailablePopover />;
  if (isAgentEvicted) return <AgentEvictedPopover />;
  throw new Error('Cannot start agent, please contact support');
};
