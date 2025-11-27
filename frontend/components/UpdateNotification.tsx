/**
 * Example component demonstrating how to use the auto-update feature.
 *
 * You can integrate this into your existing UI or use it as a reference
 * to build your own update notification system.
 */

import { Button, Modal, notification, Progress, Typography } from 'antd';
import React, { useEffect, useState } from 'react';

import type { ProgressInfo, UpdateInfo } from '../types/electron';

const { Title, Text, Paragraph } = Typography;

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  error: string | null;
  info: UpdateInfo | null;
  progress: ProgressInfo | null;
}

export const UpdateNotification: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdateState>({
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    error: null,
    info: null,
    progress: null,
  });

  useEffect(() => {
    // Check if we're in Electron environment
    if (!window.electronAPI?.updates) {
      return;
    }

    // Listen for update available
    const handleUpdateAvailable = (info: UpdateInfo) => {
      console.log('Update available:', info);
      setUpdateState((prev) => ({
        ...prev,
        available: true,
        info,
      }));

      // Show notification
      notification.info({
        message: 'Update Available',
        description: `Version ${info.version} is available for download.`,
        duration: 0, // Don't auto-close
      });
    };

    // Listen for download progress
    const handleDownloadProgress = (progress: ProgressInfo) => {
      console.log('Download progress:', progress);
      setUpdateState((prev) => ({
        ...prev,
        progress,
      }));
    };

    // Listen for update downloaded
    const handleUpdateDownloaded = (info: UpdateInfo) => {
      console.log('Update downloaded:', info);
      setUpdateState((prev) => ({
        ...prev,
        downloading: false,
        downloaded: true,
        info,
        progress: null,
      }));

      // Show notification
      notification.success({
        message: 'Update Downloaded',
        description: 'The update will be installed when you restart the app.',
        duration: 0,
      });
    };

    // Listen for update errors
    const handleUpdateError = (error: string) => {
      console.error('Update error:', error);
      setUpdateState((prev) => ({
        ...prev,
        checking: false,
        downloading: false,
        error,
      }));

      notification.error({
        message: 'Update Error',
        description: error,
      });
    };

    // Register listeners
    window.electronAPI.updates.onUpdateAvailable(handleUpdateAvailable);
    window.electronAPI.updates.onDownloadProgress(handleDownloadProgress);
    window.electronAPI.updates.onUpdateDownloaded(handleUpdateDownloaded);
    window.electronAPI.updates.onUpdateError(handleUpdateError);

    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.updates.removeUpdateListener(
        'update-available',
        handleUpdateAvailable,
      );
      window.electronAPI.updates.removeUpdateListener(
        'download-progress',
        handleDownloadProgress,
      );
      window.electronAPI.updates.removeUpdateListener(
        'update-downloaded',
        handleUpdateDownloaded,
      );
      window.electronAPI.updates.removeUpdateListener(
        'update-error',
        handleUpdateError,
      );
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.updates) {
      notification.warning({
        message: 'Not Available',
        description: 'Update checking is only available in the desktop app.',
      });
      return;
    }

    setUpdateState((prev) => ({ ...prev, checking: true, error: null }));

    try {
      const result = await window.electronAPI.updates.checkForUpdates();
      if (!result) {
        notification.info({
          message: 'No Updates',
          description: 'You are running the latest version.',
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      notification.error({
        message: 'Check Failed',
        description: 'Failed to check for updates. Please try again later.',
      });
    } finally {
      setUpdateState((prev) => ({ ...prev, checking: false }));
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI?.updates) return;

    setUpdateState((prev) => ({ ...prev, downloading: true, error: null }));

    try {
      await window.electronAPI.updates.downloadUpdate();
    } catch (error) {
      console.error('Failed to download update:', error);
      setUpdateState((prev) => ({ ...prev, downloading: false }));
    }
  };

  const handleInstallUpdate = () => {
    if (!window.electronAPI?.updates) return;
    window.electronAPI.updates.quitAndInstall();
  };

  const handleDismiss = () => {
    setUpdateState((prev) => ({
      ...prev,
      available: false,
      downloaded: false,
    }));
  };

  // Modal for update available
  const updateAvailableModal = (
    <Modal
      open={updateState.available && !updateState.downloaded}
      onCancel={handleDismiss}
      footer={[
        <Button key="later" onClick={handleDismiss}>
          Later
        </Button>,
        <Button
          key="download"
          type="primary"
          onClick={handleDownloadUpdate}
          loading={updateState.downloading}
        >
          Download Update
        </Button>,
      ]}
    >
      <Title level={4}>Update Available</Title>
      <Paragraph>
        A new version ({updateState.info?.version}) is available for download.
      </Paragraph>
      {updateState.info?.releaseNotes && (
        <>
          <Text strong>Release Notes:</Text>
          <Paragraph>{updateState.info.releaseNotes}</Paragraph>
        </>
      )}
      {updateState.downloading && updateState.progress && (
        <div style={{ marginTop: 16 }}>
          <Text>Downloading update...</Text>
          <Progress
            percent={Math.round(updateState.progress.percent)}
            status="active"
          />
          <Text type="secondary">
            {(updateState.progress.bytesPerSecond / 1024 / 1024).toFixed(2)}{' '}
            MB/s
          </Text>
        </div>
      )}
    </Modal>
  );

  // Modal for update downloaded
  const updateDownloadedModal = (
    <Modal
      open={updateState.downloaded}
      onCancel={handleDismiss}
      footer={[
        <Button key="later" onClick={handleDismiss}>
          Install Later
        </Button>,
        <Button key="install" type="primary" onClick={handleInstallUpdate}>
          Restart and Install
        </Button>,
      ]}
    >
      <Title level={4}>Update Ready</Title>
      <Paragraph>
        Version {updateState.info?.version} has been downloaded and is ready to
        install. The app will restart to apply the update.
      </Paragraph>
    </Modal>
  );

  return (
    <>
      {updateAvailableModal}
      {updateDownloadedModal}

      {/* Optional: Button to manually check for updates */}
      <Button
        onClick={handleCheckForUpdates}
        loading={updateState.checking}
        style={{ display: 'none' }} // Hide or show based on your UI needs
      >
        Check for Updates
      </Button>
    </>
  );
};
