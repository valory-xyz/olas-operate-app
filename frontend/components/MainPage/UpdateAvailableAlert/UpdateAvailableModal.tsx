import { Button, Collapse, Flex, Progress, Spin, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { Modal } from '@/components/ui';
import { DOWNLOAD_URL } from '@/constants/urls';
import { useElectronApi } from '@/hooks';

import { useAppStatus } from './useAppStatus';

const { Text } = Typography;

type ModalState = 'available' | 'downloading' | 'failed';

type UpdateAvailableModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const UpdateAvailableModal = ({
  isOpen,
  onClose,
}: UpdateAvailableModalProps) => {
  const { store, autoUpdater } = useElectronApi();
  // Capture on mount; the IPC functions from the preload bridge never change.
  const autoUpdaterRef = useRef(autoUpdater);
  const [modalState, setModalState] = useState<ModalState>('available');
  const [downloadPercent, setDownloadPercent] = useState(0);

  const { data } = useAppStatus();
  const latestTag = data?.latestTag;
  const releaseNotes = data?.releaseNotes;

  // Reset to available state each time the modal is opened
  useEffect(() => {
    if (isOpen) {
      setModalState('available');
      setDownloadPercent(0);
    }
  }, [isOpen]);

  // Register IPC listeners once on mount. The ref holds the stable preload
  // functions so the effect does not need autoUpdater in its dependency array.
  useEffect(() => {
    const api = autoUpdaterRef.current;
    if (!api) return;

    const cleanupProgress = api.onDownloadProgress?.((progress) => {
      setDownloadPercent(Math.round(progress.percent));
    });

    const cleanupDownloaded = api.onUpdateDownloaded?.(() => {
      api.quitAndInstall?.();
    });

    const cleanupError = api.onUpdateError?.(() => {
      setModalState('failed');
    });

    return () => {
      cleanupProgress?.();
      cleanupDownloaded?.();
      cleanupError?.();
    };
  }, []);

  const onUpdateLater = useCallback(() => {
    if (latestTag && store?.set) {
      store.set('updateAvailableKnownVersion', latestTag);
    }
    onClose();
  }, [latestTag, store, onClose]);

  const onUpdateAndRelaunch = useCallback(() => {
    setModalState('downloading');
    setDownloadPercent(0);
    autoUpdater?.downloadUpdate?.().catch(() => setModalState('failed'));
  }, [autoUpdater]);

  const onCancelDownload = useCallback(() => {
    autoUpdater?.cancelDownload?.();
    setModalState('available');
  }, [autoUpdater]);

  const onTryAgain = useCallback(() => {
    setModalState('downloading');
    setDownloadPercent(0);
    autoUpdater?.downloadUpdate?.().catch(() => setModalState('failed'));
  }, [autoUpdater]);

  if (!isOpen) return null;

  if (modalState === 'downloading') {
    return (
      <Modal
        open
        closable={false}
        size="small"
        header={
          <Flex justify="center" style={{ width: '100%' }}>
            <Spin size="large" style={{ fontSize: 40 }} />
          </Flex>
        }
        title="Downloading Update"
        description={
          <Flex vertical gap={12} style={{ width: '100%' }}>
            <Text type="secondary">
              Keep Pearl open until the download finishes.
            </Text>
            <Progress percent={downloadPercent} status="active" />
            <Flex justify="flex-end">
              <Button onClick={onCancelDownload}>Cancel</Button>
            </Flex>
          </Flex>
        }
      />
    );
  }

  if (modalState === 'failed') {
    return (
      <Modal
        open
        closable
        size="small"
        onCancel={onClose}
        header={
          <Image
            src="/pearl-with-gradient.png"
            width={40}
            height={40}
            alt="Pearl"
          />
        }
        title="Download Failed"
        description={
          <Flex vertical gap={12} style={{ width: '100%' }}>
            <Text type="secondary">
              Something went wrong. Please try again or download Pearl from the
              official website.
            </Text>
            <Flex gap={12} justify="flex-end">
              <Button
                onClick={() => {
                  window.open(DOWNLOAD_URL, '_blank');
                }}
              >
                Download from pearl.you
              </Button>
              <Button type="primary" onClick={onTryAgain}>
                Try Again
              </Button>
            </Flex>
          </Flex>
        }
      />
    );
  }

  return (
    <Modal
      closable
      open
      size="small"
      onCancel={onUpdateLater}
      header={
        <Image
          src="/pearl-with-gradient.png"
          width={40}
          height={40}
          alt="Pearl"
        />
      }
      title="Update Available"
      description={
        <Flex vertical gap={12} style={{ width: '100%' }}>
          <Text type="secondary">
            An updated version of Pearl is available.
          </Text>
          {releaseNotes && (
            <Collapse
              defaultActiveKey={[]}
              items={[
                {
                  key: 'release-notes',
                  label: "What's new in this version",
                  children: (
                    <div className="markdown-release-notes">
                      <ReactMarkdown>{releaseNotes}</ReactMarkdown>
                    </div>
                  ),
                },
              ]}
            />
          )}
          <Flex gap={12} justify="flex-end">
            <Button onClick={onUpdateLater}>Update Later</Button>
            <Button type="primary" onClick={onUpdateAndRelaunch}>
              Update &amp; Relaunch
            </Button>
          </Flex>
        </Flex>
      }
    />
  );
};
