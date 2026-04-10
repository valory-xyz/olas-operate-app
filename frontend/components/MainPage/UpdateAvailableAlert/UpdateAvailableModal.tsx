import { Button, Flex, Modal as AntdModal, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { PiCaretDownBold, PiCaretRightBold, PiX } from 'react-icons/pi';
import styled from 'styled-components';

import { WarningOutlined } from '@/components/custom-icons';
import { COLOR } from '@/constants';
import { DOWNLOAD_URL } from '@/constants/urls';
import { useElectronApi } from '@/hooks';
import { sanitizeReleaseNotes } from '@/utils/sanitizeHtml';

import { useAppStatus } from './useAppStatus';

const { Text } = Typography;

type ModalState = 'available' | 'downloading' | 'failed';

type DownloadProgress = {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
};

const formatBytes = (bytes: number): string =>
  `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const formatTimeLeft = (seconds: number): string =>
  seconds >= 60
    ? `\u2248${Math.ceil(seconds / 60)} min left`
    : `\u2248${Math.ceil(seconds)}s left`;

const getProgressDetails = (progress: DownloadProgress | null) => {
  if (!progress || progress.total <= 0) return { percent: 0 };
  return {
    percent: progress.percent,
    sizeLabel: `${formatBytes(progress.transferred)} / ${formatBytes(progress.total)}`,
    timeLabel:
      progress.bytesPerSecond > 0
        ? formatTimeLeft(
            (progress.total - progress.transferred) / progress.bytesPerSecond,
          )
        : undefined,
  };
};

type UpdateAvailableModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AccordionContainer = styled.div`
  background: ${COLOR.BACKGROUND};
  border: 1px solid ${COLOR.GRAY_4};
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
  color: ${COLOR.TEXT_NEUTRAL_SECONDARY};
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
    color: ${COLOR.TEXT_NEUTRAL_SECONDARY};
    margin: 0 0 4px;
  }
  ul {
    font-size: 14px;
    line-height: 20px;
    color: ${COLOR.TEXT_NEUTRAL_SECONDARY};
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
  color: ${COLOR.TEXT_NEUTRAL_SECONDARY};

  &:hover {
    background: ${COLOR.BACKGROUND};
  }
`;

const ReleaseNotesAccordion = ({ releaseNotes }: { releaseNotes: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <AccordionContainer>
      <AccordionHeader onClick={() => setIsExpanded((prev) => !prev)}>
        {isExpanded ? (
          <PiCaretDownBold size={14} color={COLOR.TEXT_NEUTRAL_SECONDARY} />
        ) : (
          <PiCaretRightBold size={14} color={COLOR.TEXT_NEUTRAL_SECONDARY} />
        )}
        What&apos;s new in this version
      </AccordionHeader>
      {isExpanded && (
        <AccordionContent
          dangerouslySetInnerHTML={{
            __html: sanitizeReleaseNotes(releaseNotes),
          }}
        />
      )}
    </AccordionContainer>
  );
};

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  background: ${COLOR.GRAY_4};
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: ${COLOR.PURPLE};
  transition: width 0.3s ease;
`;

const MODAL_WIDTH = 450;
const MODAL_STYLES = {
  content: {
    borderRadius: 12,
    padding: 32,
    position: 'relative' as const,
  },
};

export const UpdateAvailableModal = ({
  isOpen,
  onClose,
}: UpdateAvailableModalProps) => {
  const { store, updates } = useElectronApi();
  const [modalState, setModalState] = useState<ModalState>('available');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  const { data } = useAppStatus();
  const latestTag = data?.latestTag;
  const releaseNotes = data?.releaseNotes;

  useEffect(() => {
    if (isOpen) {
      setModalState('available');
      setProgress(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!updates) return;

    const cleanupProgress = updates.onDownloadProgress?.(setProgress);

    const cleanupDownloaded = updates.onUpdateDownloaded?.(() => {
      updates.quitAndInstall?.();
    });

    const cleanupError = updates.onUpdateError?.((err) => {
      console.error(err.message);
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

  const startDownload = useCallback(() => {
    setModalState('downloading');
    updates?.downloadUpdate?.().catch(() => setModalState('failed'));
  }, [updates]);

  const onCancelDownload = useCallback(() => {
    updates?.cancelDownload?.();
    setModalState('available');
  }, [updates]);

  if (!isOpen) return null;

  if (modalState === 'downloading') {
    const { percent, sizeLabel, timeLabel } = getProgressDetails(progress);

    return (
      <AntdModal
        open
        centered
        closable={false}
        footer={null}
        width={MODAL_WIDTH}
        styles={{ content: MODAL_STYLES.content }}
      >
        <CloseButton onClick={onCancelDownload}>
          <PiX size={20} />
        </CloseButton>
        <Flex vertical gap={24}>
          <Flex vertical gap={12}>
            <Text strong style={{ fontSize: 20, color: COLOR.TEXT }}>
              Downloading Update
            </Text>
            <Text
              style={{
                fontSize: 16,
                lineHeight: '24px',
                color: COLOR.TEXT_NEUTRAL_SECONDARY,
              }}
            >
              Keep Pearl open until the download finishes.
            </Text>
          </Flex>
          <Flex vertical gap={8}>
            <Flex justify="space-between">
              {sizeLabel && (
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: '20px',
                    color: COLOR.TEXT_NEUTRAL_TERTIARY,
                  }}
                >
                  {sizeLabel}
                </Text>
              )}
              {timeLabel && (
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: '20px',
                    color: COLOR.TEXT_NEUTRAL_TERTIARY,
                  }}
                >
                  {timeLabel}
                </Text>
              )}
            </Flex>
            <ProgressBarTrack>
              <ProgressBarFill $percent={percent} />
            </ProgressBarTrack>
          </Flex>
        </Flex>
      </AntdModal>
    );
  }

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
            <Text strong style={{ fontSize: 20, color: COLOR.TEXT }}>
              Download Failed
            </Text>
            <Text
              style={{
                fontSize: 16,
                lineHeight: '24px',
                color: COLOR.TEXT_NEUTRAL_SECONDARY,
              }}
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
              onClick={startDownload}
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

        <Flex gap={12} justify="flex-end">
          <Button size="large" onClick={onUpdateLater}>
            Update Later
          </Button>
          <Button
            size="large"
            type="primary"
            onClick={startDownload}
            style={{ background: COLOR.PURPLE }}
          >
            Update &amp; Relaunch
          </Button>
        </Flex>
      </Flex>
    </AntdModal>
  );
};
