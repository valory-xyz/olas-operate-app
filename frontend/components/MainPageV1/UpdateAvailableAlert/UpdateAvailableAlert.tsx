import { Flex, theme } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { ArrowUpRightSvg } from '@/components/custom-icons/ArrowUpRight';
import { Download } from '@/components/custom-icons/Donwload';
import { DOWNLOAD_URL } from '@/constants';

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
        className="mt-auto"
        message={
          <Flex vertical gap={2}>
            <Download className="mb-4" />
            <span>Pearl Update Available</span>
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
    </>
  );
};
