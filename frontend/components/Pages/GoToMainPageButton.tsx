import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import { Pages } from '@/enums/PageState';
import { usePageState } from '@/hooks/usePageState';

export const GoToMainPageButton = () => {
  const { goto } = usePageState();

  return (
    <Button
      size="large"
      icon={<CloseOutlined />}
      onClick={() => goto(Pages.Main)}
    />
  );
};
