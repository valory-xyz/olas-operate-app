import { Button, Flex, Modal, Typography } from 'antd';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { MODAL_WIDTH } from '@/constants/sizes';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useStore } from '@/hooks/useStore';

const { Title, Paragraph } = Typography;

export const UpdateModal = () => {
  const { storeState } = useStore();
  const { store, ipcRenderer, startDownload, checkForUpdates } =
    useElectronApi();

  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    // Initial load
    store?.set?.('canCheckForUpdates', true);

    checkForUpdates?.()
      .then((res) => {
        console.log('checkForUpdates', res);
      })
      .catch((err) => {
        console.error('checkForUpdates', err);
      });
  }, []);

  // listen for update available event
  useEffect(() => {
    ipcRenderer?.on?.('update-available', (info) => {
      if (!info) return;
      if (storeState?.canCheckForUpdates === false) return;

      setIsModalVisible(true);
      store?.set?.('canCheckForUpdates', false);
    });

    return () => {
      ipcRenderer?.removeAllListeners?.('update-available');
    };
  }, [ipcRenderer, storeState]);

  const handleInstall = () => {
    startDownload?.();
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    store?.set?.('canCheckForUpdates', false);
  };

  return (
    <Modal
      open={isModalVisible}
      title={null}
      onCancel={handleCancel}
      width={MODAL_WIDTH}
      closable={false}
      footer={[
        <Flex key="footer" vertical gap={12}>
          <Button
            key="install"
            type="primary"
            size="large"
            block
            onClick={handleInstall}
          >
            Download and install now
          </Button>
          <Button key="cancel" size="large" block onClick={handleCancel}>
            Install on next launch
          </Button>
        </Flex>,
      ]}
    >
      <Flex align="center" justify="center" gap={12} vertical>
        <Image
          src="/splash-robot-head-dock.png"
          width={100}
          height={100}
          alt="OLAS logo"
        />

        <Title level={5} className="m-0">
          Update Available
        </Title>

        <Paragraph className="mb-8">
          A new version of Pearl is ready to be downloaded and installed!
        </Paragraph>
      </Flex>
    </Modal>
  );
};
