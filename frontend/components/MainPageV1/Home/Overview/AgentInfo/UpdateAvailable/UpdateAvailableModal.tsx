import { Button, Flex, Modal, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useToggle } from 'usehooks-ts';

import { DOWNLOAD_URL } from '@/constants/urls';
import { useElectronApi, useUpdateStatus } from '@/hooks';

const { Title, Text } = Typography;

const UpdateModal = styled(Modal)`
  .ant-modal-content {
    box-sizing: border-box;
    padding: 24px;
  }

  .ant-modal-footer {
    display: flex;
    justify-content: space-between;
  }
`;

const ModalContent = () => (
  <>
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
    <Text className="mb-24">An updated version of Pearl just released.</Text>
  </>
);

export const UpdateAvailableModal = () => {
  const { store } = useElectronApi();
  const [open, toggleOpen] = useToggle(false);

  const { data, isFetched } = useUpdateStatus();
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
    <UpdateModal
      open
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
      <ModalContent />
    </UpdateModal>
  );
};
