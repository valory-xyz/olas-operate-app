import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

export const GoToLoginPageButton = () => {
  const { goto } = useSetup();

  return (
    <Button
      size="large"
      icon={<CloseOutlined />}
      onClick={() => goto(SetupScreen.Welcome)}
    />
  );
};
