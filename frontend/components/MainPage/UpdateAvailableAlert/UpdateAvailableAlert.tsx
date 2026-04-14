import { Flex, Typography } from 'antd';
import { TbDownload } from 'react-icons/tb';
import styled from 'styled-components';

import { COLOR } from '@/constants';

import { useAppStatus } from './useAppStatus';

const { Text } = Typography;

type UpdateAvailableAlertProps = {
  onOpen: () => void;
};

const CardButton = styled.button`
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  background: ${COLOR.PURPLE_LIGHT_3};
  text-align: left;
  transition: background 0.15s;

  &:hover {
    background: ${COLOR.PURPLE_LIGHT_4};
  }

  &:active {
    background: ${COLOR.PURPLE_LIGHT_4};
  }
`;

export const UpdateAvailableAlert = ({ onOpen }: UpdateAvailableAlertProps) => {
  const { data, isFetched, isError, error } = useAppStatus();

  if (isError) {
    console.error('Update check failed:', error);
    return null;
  }

  if (!isFetched || !data?.isOutdated) {
    return null;
  }

  return (
    <CardButton onClick={onOpen} className="mb-16">
      <Flex align="center" gap={10}>
        <TbDownload fontSize={20} color={COLOR.PURPLE} />
        <Text style={{ color: COLOR.PURPLE, fontWeight: 500, fontSize: 14 }}>
          Update Pearl Now
        </Text>
      </Flex>
    </CardButton>
  );
};
