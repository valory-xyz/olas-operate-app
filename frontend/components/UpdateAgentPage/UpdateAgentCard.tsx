import { EditOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { ReactNode, useCallback, useContext } from 'react';

import { CardTitle } from '../Card/CardTitle';
import { CardFlex } from '../styled/CardFlex';
import { UpdateAgentContext } from './context/UpdateAgentProvider';

const EditButton = () => {
  const { setIsEditing } = useContext(UpdateAgentContext);

  const handleEdit = useCallback(() => {
    setIsEditing?.((prev) => !prev);
  }, [setIsEditing]);

  return (
    <Button icon={<EditOutlined />} onClick={handleEdit}>
      Edit
    </Button>
  );
};

type CardLayoutProps = { onClickBack: () => void; children: ReactNode };

export const UpdateAgentCard = ({ onClickBack, children }: CardLayoutProps) => {
  const { isEditing } = useContext(UpdateAgentContext);

  return (
    <CardFlex
      title={
        <CardTitle
          backButtonCallback={onClickBack}
          title={isEditing ? 'Edit agent settings' : 'Agent settings'}
        />
      }
      extra={isEditing ? null : <EditButton />}
      bordered={false}
    >
      {children}
    </CardFlex>
  );
};
