import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import { PAGES } from '@/constants';
import { usePageState } from '@/hooks/usePageState';

export const GoToMainPageButton = () => {
  const { goto } = usePageState();

  return (
    <Button
      size="large"
      icon={<CloseOutlined />}
      onClick={() => goto(PAGES.Main)}
    />
  );
};
