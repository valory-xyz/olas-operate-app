import { IdcardTwoTone, SmileTwoTone } from '@ant-design/icons';
import { Flex, Segmented } from 'antd';
import { Dispatch, SetStateAction, useState } from 'react';

import { COLOR } from '@/constants/colors';
import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { useServices } from '@/hooks/useServices';

import { Overview } from './Overview';

type View = 'overview' | 'profile';

type SwitcherProps = {
  value: View;
  onChange: Dispatch<SetStateAction<View>>;
};
const Switcher = ({ value, onChange }: SwitcherProps) => {
  const { selectedService } = useServices();
  const isRunning =
    selectedService?.deploymentStatus ===
    MiddlewareDeploymentStatusMap.DEPLOYED;

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
          disabled: !isRunning,
        },
      ]}
    />
  );
};

export const Home = () => {
  const [view, setView] = useState<View>('overview');

  return (
    <Flex vertical gap={40}>
      <Switcher value={view} onChange={setView} />
      {view === 'overview' && <Overview />}
      {view === 'profile' && <div>Profile to be added</div>}
    </Flex>
  );
};
