import type { CollapseProps } from 'antd';
import { Collapse, Divider, Flex, Modal, Typography } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants';

const { Text } = Typography;

type RoundInfo = {
  name?: string;
  description?: string;
};

type AgentActivityModalProps = {
  open: boolean;
  onClose: () => void;
  rounds: string[];
  roundsInfo?: Record<string, RoundInfo>;
};

const ModalCollapseItem = styled(Collapse)`
  background: none;
  font-size: 14px;
  max-height: 400px;
  overflow-y: auto;

  .ant-collapse-header {
    padding: 12px 0 !important;
  }

  .ant-collapse-item-active > .ant-collapse-header .ant-collapse-header-text {
    font-weight: 500;
  }
`;

const CurrentActionContainer = styled(Flex)`
  border-radius: 10px;
  background: ${COLOR.BACKGROUND};
  padding: 16px;
`;

export const AgentActivityModal = ({
  open,
  onClose,
  rounds,
  roundsInfo = {},
}: AgentActivityModalProps) => {
  const items = useMemo<CollapseProps['items']>(() => {
    return rounds.map((roundId, index) => {
      const info = roundsInfo?.[roundId];
      return {
        key: `${roundId}-${index}`,
        label: info?.name || `Round ${index + 1}`,
        children: info?.description || 'No details provided.',
      };
    });
  }, [rounds, roundsInfo]);

  // separates current and previous actions
  // item[0] is the current action
  // item[1...] are the previous actions
  const previousActions = items?.slice(1);

  const currentActionName = useMemo(() => {
    const currentRound = rounds[0];
    if (!currentRound) return;
    return roundsInfo?.[currentRound]?.name || currentRound;
  }, [rounds, roundsInfo]);

  const currentActionDescription = useMemo(() => {
    const currentRound = rounds[0];
    if (!currentRound) return;
    return roundsInfo?.[currentRound]?.description;
  }, [rounds, roundsInfo]);

  return (
    <Modal
      title="Agent Activity"
      open={open}
      onCancel={onClose}
      footer={null}
      closable
      maskClosable
      style={{ top: 40 }}
    >
      <Flex vertical gap={8}>
        <Text className="text-sm">Current action</Text>
        <CurrentActionContainer vertical>
          {currentActionName && <Text strong>{currentActionName}</Text>}
          {currentActionDescription && (
            <Text className="text-sm">{currentActionDescription}</Text>
          )}
        </CurrentActionContainer>
        <Divider />
        <Text strong>History</Text>
        <ModalCollapseItem items={previousActions} bordered={false} />
      </Flex>
    </Modal>
  );
};
