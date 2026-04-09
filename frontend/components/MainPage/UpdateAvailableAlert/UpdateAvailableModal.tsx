import { Button, Flex, Modal as AntdModal, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { PiCaretDownBold, PiCaretRightBold, PiX } from 'react-icons/pi';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';

import { LoadingOutlined, WarningOutlined } from '@/components/custom-icons';
import { COLOR } from '@/constants';
import { DOWNLOAD_URL } from '@/constants/urls';
import { useElectronApi } from '@/hooks';

import { useAppStatus } from './useAppStatus';

const { Text } = Typography;

type ModalState = 'available' | 'downloading' | 'failed';

type UpdateAvailableModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

// -- Styled components --

const AccordionContainer = styled.div`
  background: #f4f7fa;
  border: 1px solid #eaedf1;
  border-radius: 10px;
  overflow: hidden;
`;

const AccordionHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #363f49;
  text-align: left;
`;

const AccordionContent = styled.div`
  background: white;
  padding: 16px;
  max-height: 240px;
  overflow-y: auto;

  h1,
  h2,
  h3 {
    font-size: 14px;
    font-weight: 500;
    color: black;
    margin: 8px 0 4px;
  }
  h1:first-child,
  h2:first-child,
  h3:first-child {
    margin-top: 0;
  }
  p {
    font-size: 14px;
    line-height: 20px;
    color: #363f49;
    margin: 0 0 4px;
  }
  ul {
    font-size: 14px;
    line-height: 20px;
    color: #363f49;
    margin: 0;
    padding-left: 20px;
    list-style: disc;
  }
  li {
    margin-bottom: 4px;
  }
  li strong {
    color: black;
    font-weight: 500;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #363f49;

  &:hover {
    background: #f4f7fa;
  }
`;

// -- Sub-components --

const ReleaseNotesAccordion = ({ releaseNotes }: { releaseNotes: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <AccordionContainer>
      <AccordionHeader onClick={() => setIsExpanded((prev) => !prev)}>
        {isExpanded ? (
          <PiCaretDownBold size={14} color="#363f49" />
        ) : (
          <PiCaretRightBold size={14} color="#363f49" />
        )}
        What&apos;s new in this version
      </AccordionHeader>
      {isExpanded && (
        <AccordionContent>
          <ReactMarkdown>{releaseNotes}</ReactMarkdown>
        </AccordionContent>
      )}
    </AccordionContainer>
  );
};

// -- Modal styles (bypass custom Modal, use AntdModal directly) --

const MODAL_WIDTH = 450;
const MODAL_STYLES = {
  content: {
    borderRadius: 12,
    padding: 32,
    position: 'relative' as const,
  },
};

// -- Main component --

export const UpdateAvailableModal = ({
  isOpen,
  onClose,
}: UpdateAvailableModalProps) => {
  const { store, autoUpdater } = useElectronApi();
  const [modalState, setModalState] = useState<ModalState>('available');

  const { data } = useAppStatus();
  const latestTag = data?.latestTag;
  const releaseNotes = data?.releaseNotes;

  useEffect(() => {
    if (isOpen) {
      setModalState('available');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!autoUpdater) return;

    const cleanupProgress = autoUpdater.onDownloadProgress?.(() => {
      // Progress tracking available if needed in future
    });

    const cleanupDownloaded = autoUpdater.onUpdateDownloaded?.(() => {
      autoUpdater.quitAndInstall?.();
    });

    const cleanupError = autoUpdater.onUpdateError?.(() => {
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
    autoUpdater?.downloadUpdate?.().catch(() => setModalState('failed'));
  }, [autoUpdater]);

  const onCancelDownload = useCallback(() => {
    autoUpdater?.cancelDownload?.();
    setModalState('available');
  }, [autoUpdater]);

  const onTryAgain = useCallback(() => {
    setModalState('downloading');
    autoUpdater?.downloadUpdate?.().catch(() => setModalState('failed'));
  }, [autoUpdater]);

  if (!isOpen) return null;

  // Downloading state
  if (modalState === 'downloading') {
    return (
      <AntdModal
        open
        centered
        closable={false}
        footer={null}
        width={MODAL_WIDTH}
        styles={{ content: MODAL_STYLES.content }}
      >
        <Flex vertical align="center" gap={32}>
          <LoadingOutlined />
          <Flex
            vertical
            align="center"
            gap={12}
            style={{ textAlign: 'center' }}
          >
            <Text strong style={{ fontSize: 20, color: '#1f2229' }}>
              Downloading Update
            </Text>
            <Text
              style={{ fontSize: 16, lineHeight: '24px', color: '#363f49' }}
            >
              Keep Pearl open until the download finishes.
            </Text>
          </Flex>
          <Button block size="large" onClick={onCancelDownload}>
            Cancel
          </Button>
        </Flex>
      </AntdModal>
    );
  }

  // Failed state
  if (modalState === 'failed') {
    return (
      <AntdModal
        open
        centered
        closable={false}
        footer={null}
        width={MODAL_WIDTH}
        styles={{ content: MODAL_STYLES.content }}
      >
        <CloseButton onClick={onClose}>
          <PiX size={20} />
        </CloseButton>
        <Flex vertical align="center" gap={32}>
          <WarningOutlined />
          <Flex
            vertical
            align="center"
            gap={12}
            style={{ textAlign: 'center' }}
          >
            <Text strong style={{ fontSize: 20, color: '#1f2229' }}>
              Download Failed
            </Text>
            <Text
              style={{ fontSize: 16, lineHeight: '24px', color: '#363f49' }}
            >
              Something went wrong. Please try again or download Pearl from the
              official website.
            </Text>
          </Flex>
          <Flex vertical gap={16} style={{ width: '100%' }}>
            <Button
              block
              size="large"
              type="primary"
              onClick={onTryAgain}
              style={{ background: COLOR.PURPLE }}
            >
              Try Again
            </Button>
            <Button
              block
              size="large"
              onClick={() => {
                window.open(DOWNLOAD_URL, '_blank');
              }}
            >
              Download from pearl.you
            </Button>
          </Flex>
        </Flex>
      </AntdModal>
    );
  }

  // Available state
  return (
    <AntdModal
      open
      centered
      closable={false}
      footer={null}
      width={MODAL_WIDTH}
      styles={{ content: MODAL_STYLES.content }}
    >
      <CloseButton onClick={onUpdateLater}>
        <PiX size={20} />
      </CloseButton>
      <Flex vertical gap={24}>
        {/* Text section: icon, title, subtitle, accordion */}
        <Flex vertical gap={16}>
          <Image
            src="/pearl-with-gradient.png"
            width={40}
            height={40}
            alt="Pearl"
          />
          <Flex vertical gap={8}>
            <Text strong style={{ fontSize: 18 }}>
              Update Available
            </Text>
            <Text type="secondary">
              An updated version of Pearl is available.
            </Text>
          </Flex>
          {releaseNotes && (
            <ReleaseNotesAccordion releaseNotes={releaseNotes} />
          )}
        </Flex>

        {/* Buttons */}
        <Flex gap={12} justify="flex-end">
          <Button size="large" onClick={onUpdateLater}>
            Update Later
          </Button>
          <Button
            size="large"
            type="primary"
            onClick={onUpdateAndRelaunch}
            style={{ background: COLOR.PURPLE }}
          >
            Update &amp; Relaunch
          </Button>
        </Flex>
      </Flex>
    </AntdModal>
  );
};
