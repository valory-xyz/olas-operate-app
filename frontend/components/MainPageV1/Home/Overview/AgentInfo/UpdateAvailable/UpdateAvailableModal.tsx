import { useQuery } from '@tanstack/react-query';
import { Button, Flex, Modal, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { GITHUB_API_LATEST_RELEASE } from '@/constants/urls';
import { useElectronApi } from '@/hooks/useElectronApi';

const { Title } = Typography;

const DOWNLOAD_ON_OLAS_URL = 'https://olas.network/pearl#download';

export const UpdateAvailableModal = () => {
  const { getAppVersion, store } = useElectronApi();

  const [latestTag, setLatestTag] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const { data: fetchedLatestTag } = useQuery<string | null>({
    queryKey: ['latestReleaseTag'],
    queryFn: async (): Promise<string | null> => {
      const response = await fetch(GITHUB_API_LATEST_RELEASE);
      if (!response.ok) return null;
      const data = await response.json();
      return data.tag_name ?? null;
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const evaluate = async () => {
      if (!fetchedLatestTag) return;

      setLatestTag(fetchedLatestTag);

      if (store?.get) {
        const dismissedFor = (await store.get(
          'updateAvailableKnownVersion',
        )) as string | undefined;
        if (dismissedFor !== fetchedLatestTag) {
          setOpen(true);
        }
      }
    };

    evaluate();
  }, [getAppVersion, store, fetchedLatestTag]);

  const onUpdateLater = useCallback(() => {
    if (latestTag && store?.set) {
      store.set('updateAvailableKnownVersion', latestTag);
    }
    setOpen(false);
  }, [latestTag, store]);

  const onDownload = useCallback(() => {
    window.open(DOWNLOAD_ON_OLAS_URL, '_blank');
    setOpen(false);
  }, []);

  const shouldRender = useMemo(() => open, [open]);
  if (!shouldRender) return null;

  return (
    <Modal
      open={open}
      width={386}
      className="update-modal"
      onCancel={onUpdateLater}
      footer={[
        <Button key="later" className="text-sm" onClick={onUpdateLater}>
          Update Later
        </Button>,
        <Button
          key="download"
          className="text-sm"
          type="primary"
          onClick={onDownload}
        >
          Download on olas.network
        </Button>,
      ]}
    >
      <Flex>
        <Image
          src="/pearl-with-gradient.png"
          width={40}
          height={40}
          alt="Pearl"
        />
      </Flex>
      <Title level={5} className="mt-12">
        Update Available
      </Title>
      <div className="mb-24">An updated version of Pearl just released.</div>
    </Modal>
  );
};
