import { IdcardTwoTone, SmileTwoTone } from '@ant-design/icons';
import { Flex, message, Segmented } from 'antd';
import get from 'lodash/get';
import { useCallback, useEffect, useState } from 'react';

import { COLOR } from '@/constants/colors';
import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { useServices } from '@/hooks/useServices';
import { useStore } from '@/hooks/useStore';

import { Overview } from './Overview/Overview';
import { Profile } from './Profile/Profile';
import { UnlockChatUiAlert } from './Profile/UnlockChatUiAlert';

type View = 'overview' | 'profile';

type SwitcherProps = {
  value: View;
  onChange: (value: View) => void;
};

const Switcher = ({ value, onChange }: SwitcherProps) => {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      className="mx-auto"
      size="large"
      options={[
        {
          value: 'overview',
          icon: <IdcardTwoTone twoToneColor={COLOR.PURPLE} />,
          label: 'Overview',
        },
        {
          value: 'profile',
          icon: <SmileTwoTone twoToneColor={COLOR.PURPLE} />,
          label: 'Profile',
        },
      ]}
    />
  );
};

export const Home = () => {
  const { storeState } = useStore();
  const { selectedAgentType, selectedService, selectedAgentConfig } =
    useServices();

  const [view, setView] = useState<View>('overview');
  const [isUnlockChatUiModalOpen, setIsUnlockChatUiModalOpen] = useState(false);

  // Reset view to overview when switching between agents
  useEffect(() => setView('overview'), [selectedAgentType]);

  const handleChangeView = useCallback(
    (nextView: View) => {
      // Always allow switching back to overview
      if (nextView === 'overview') {
        setView('overview');
        return;
      }

      // Ensure agent is running before opening profile
      if (
        selectedService?.deploymentStatus !==
        MiddlewareDeploymentStatusMap.DEPLOYED
      ) {
        message.open({
          type: 'error',
          content:
            'Please run the agent first, before attempting to view the agent UI',
          style: { margin: '0 auto' },
        });
        return;
      }

      const requiresChatUI = selectedAgentConfig.hasChatUI;
      const profileWarningDismissed = get(
        storeState,
        `${selectedAgentType}.isProfileWarningDisplayed`,
      );
      const geminiApiKey = selectedService?.env_variables?.GENAI_API_KEY?.value;

      if (requiresChatUI) {
        // If user already skipped the warning → go straight to profile
        if (profileWarningDismissed) {
          setView('profile');
          return;
        }

        // Chat UI requires Gemini key → show modal if missing
        if (!geminiApiKey) {
          setIsUnlockChatUiModalOpen(true);
          return;
        }

        // Otherwise unlock profile with chat UI
        setView('profile');
        return;
      }

      // If chat UI not required → just go to profile
      setView('profile');
    },
    [
      selectedAgentConfig.hasChatUI,
      selectedAgentType,
      selectedService?.deploymentStatus,
      selectedService?.env_variables?.GENAI_API_KEY?.value,
      storeState,
    ],
  );

  return (
    <Flex vertical gap={40} className="flex-auto">
      <Switcher value={view} onChange={handleChangeView} />
      {view === 'overview' && (
        <Overview openProfile={() => handleChangeView('profile')} />
      )}
      {view === 'profile' && <Profile />}
      <UnlockChatUiAlert
        isOpen={isUnlockChatUiModalOpen}
        onClose={() => setIsUnlockChatUiModalOpen(false)}
        onSkip={() => setView('profile')}
      />
    </Flex>
  );
};
