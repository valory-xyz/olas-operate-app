import { Flex, theme } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { ArrowUpRightSvg } from '@/components/custom-icons/ArrowUpRight';
import { DOWNLOAD_URL } from '@/constants';

import { UpdateAvailableModal } from './UpdateAvailableModal';
import { useAppStatus } from './useAppStatus';

export const UpdateAvailableAlert = () => {
  const { token } = theme.useToken();
  const { data, isFetched, isError, error } = useAppStatus();

  if (isError) {
    console.error('Update check failed:', error);
    return null;
  }

  if (!isFetched || !data?.isOutdated) {
    return null;
  }

  return (
    <>
      <CustomAlert
        type="info"
        showIcon
        className="mt-16"
        message={
          <Flex align="center" justify="space-between" gap={2}>
            <span>A new version of Pearl is available</span>
            <a href={DOWNLOAD_URL} target="_blank">
              Download{' '}
              <ArrowUpRightSvg
                fill={token.colorPrimary}
                style={{ marginBottom: -2 }}
              />
            </a>
          </Flex>
        }
      />
      <UpdateAvailableModal />
    </>
  );
};
