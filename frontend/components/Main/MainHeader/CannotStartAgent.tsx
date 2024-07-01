import { InfoCircleOutlined } from '@ant-design/icons';
import { Popover, PopoverProps, Typography } from 'antd';

import { COLOR, SUPPORT_URL } from '@/constants';
import { UNICODE_SYMBOLS } from '@/constants/unicode';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';

const { Paragraph, Text } = Typography;

const cannotStartAgentText = (
  <Text style={{ color: COLOR.RED }}>
    Cannot start agent&nbsp;
    <InfoCircleOutlined />
  </Text>
);

const evictedDescription =
  "You didn't run your agent enough and it missed its targets multiple times. Please wait a few days and try to run your agent again.";
const AgentEvictedPopover = () => (
  <Popover
    {...otherPopoverProps}
    title="Your agent was evicted"
    content={<div style={{ maxWidth: 340 }}>{evictedDescription}</div>}
  >
    {cannotStartAgentText}
  </Popover>
);

const otherPopoverProps: PopoverProps = {
  arrow: false,
  placement: 'bottomRight',
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

export const CannotStartAgent = () => {
  const {
    canStartAgent,
    hasEnoughServiceSlots,
    isRewardsAvailable,
    isAgentEvicted,
  } = useStakingContractInfo();

  if (canStartAgent) return null;
  if (!hasEnoughServiceSlots) return <NoJobsAvailablePopover />;
  if (!isRewardsAvailable) return <NoRewardsAvailablePopover />;
  if (isAgentEvicted) return <AgentEvictedPopover />;
  throw new Error('Cannot start agent, please contact support');
};
