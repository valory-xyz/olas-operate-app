import { Button, Flex } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect } from 'react';
import { useToggle } from 'usehooks-ts';

import { Modal } from '@/components/ui';
import { DOWNLOAD_URL } from '@/constants/urls';
import { useElectronApi } from '@/hooks';

import { useAppStatus } from './useAppStatus';

export const UpdateAvailableModal = () => {
  const { store } = useElectronApi();
  const [open, toggleOpen] = useToggle(false);

  const { data, isFetched } = useAppStatus();
  const latestTag = data?.latestTag;

  useEffect(() => {
    if (!isFetched || !latestTag || !data.isOutdated) return;

    if (!store?.get) return;

    store
      .get('updateAvailableKnownVersion')
      .then((dismissedFor) => {
        if (dismissedFor !== latestTag) {
          toggleOpen();
        }
      })
      .catch((error) => {
        console.error('Failed to check update availability:', error);
      });
  }, [isFetched, latestTag, data?.isOutdated, store, toggleOpen]);

  const onUpdateLater = useCallback(() => {
    if (latestTag && store?.set) {
      store.set('updateAvailableKnownVersion', latestTag);
    }
    toggleOpen();
  }, [latestTag, store, toggleOpen]);

  const onDownload = useCallback(() => {
    window.open(DOWNLOAD_URL, '_blank');
    toggleOpen();
  }, [toggleOpen]);

  if (!open) return null;

  return (
    <Modal
      closable
      open
      width={400}
      align="left"
      onCancel={onUpdateLater}
      footer={
        <Flex justify="space-between">
          <Button key="later" className="text-sm" onClick={onUpdateLater}>
            Update Later
          </Button>
          <Button
            key="download"
            className="text-sm"
            type="primary"
            onClick={onDownload}
          >
            Download on olas.network
          </Button>
        </Flex>
      }
      header={
        <Image
          src="/pearl-with-gradient.png"
          width={40}
          height={40}
          alt="Pearl"
        />
      }
      title="Update Available"
      description="An updated version of Pearl just released."
    />
  );
};
