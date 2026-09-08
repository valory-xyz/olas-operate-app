import { Button, Flex, Typography } from 'antd';
import { TbMessage2Question } from 'react-icons/tb';
import styled from 'styled-components';

import { COLOR } from '@/constants';
import { useOnboardingSurvey } from '@/hooks';

const { Text } = Typography;

// Mirrors UpdateAvailableAlert's card, but as a card *containing* a button rather than one big
// button: the design gives the nudge a distinct "Give feedback" CTA.
const NudgeCard = styled.div`
  width: 100%;
  border-radius: 8px;
  padding: 12px;
  background: ${COLOR.PURPLE_LIGHT_3};
`;

/**
 * Sidebar reminder for a questionnaire that was shown but never submitted.
 *
 * Disappears on submission, and automatically once the 2-week window lapses — both decided by
 * `useOnboardingSurvey`, not here.
 */
export const SurveyNudge = () => {
  const { showNudge, open } = useOnboardingSurvey();

  if (!showNudge) return null;

  return (
    <NudgeCard className="mb-16">
      <Flex vertical gap={10} align="flex-start">
        <Flex align="center" gap={10}>
          <TbMessage2Question fontSize={20} color={COLOR.PURPLE} />
          <Text style={{ color: COLOR.PURPLE, fontWeight: 500, fontSize: 14 }}>
            Tell the Pearl team how your setup went
          </Text>
        </Flex>
        <Button size="small" onClick={open}>
          Give feedback
        </Button>
      </Flex>
    </NudgeCard>
  );
};
