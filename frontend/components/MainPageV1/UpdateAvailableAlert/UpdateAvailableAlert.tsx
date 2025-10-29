import { Flex } from 'antd';
import { FiArrowUpRight } from 'react-icons/fi';
import { TbDownload } from 'react-icons/tb';

import { CustomAlert } from '@/components/Alert';
import { COLOR, DOWNLOAD_URL } from '@/constants';

import { useAppStatus } from './useAppStatus';

export const UpdateAvailableAlert = () => {
  const { data, isFetched, isError, error } = useAppStatus();

  if (isError) {
    console.error('Update check failed:', error);
    return null;
  }

  if (!isFetched || !data?.isOutdated) {
    return null;
  }

  return (
    <CustomAlert
      type="info"
      className="mt-auto mb-16 text-sm"
      message={
        <Flex vertical gap={2}>
          <TbDownload
            fontSize={20}
            className="mb-4"
            color={COLOR.ICON_COLOR.INFO}
          />
          <span>Pearl Update Available</span>
          <a href={DOWNLOAD_URL} target="_blank">
            Download{' '}
            <FiArrowUpRight fontSize={20} style={{ marginBottom: -4 }} />
          </a>
        </Flex>
      }
    />
  );
};
