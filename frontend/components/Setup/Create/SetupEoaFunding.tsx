import {
  CopyOutlined,
  InfoCircleOutlined,
  // QrcodeOutlined
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Flex,
  message,
  // Popover,
  // QRCode,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { Chain } from '@/client';
import { copyToClipboard } from '@/common-util';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import {
  COLOR,
  COW_SWAP_GNOSIS_XDAI_OLAS_URL,
  MIN_ETH_BALANCE_THRESHOLDS,
} from '@/constants';
import { UNICODE_SYMBOLS } from '@/constants/unicode';
import { PageState, SetupScreen } from '@/enums';
import { useBalance, usePageState, useSetup } from '@/hooks';
import { useWallet } from '@/hooks/useWallet';
import { WalletService } from '@/service/Wallet';
import { Address } from '@/types';

import { SetupCreateHeader } from './SetupCreateHeader';

enum SetupEaoFundingStatus {
  WaitingForEoaFunding,
  CreatingSafe,
  Done,
  Error,
}

const loadingStatuses = [
  SetupEaoFundingStatus.WaitingForEoaFunding,
  SetupEaoFundingStatus.CreatingSafe,
];

export const SetupEoaFunding = ({
  isIncomplete,
}: {
  isIncomplete?: boolean;
}) => {
  const { masterEoaAddress: masterEaoAddress, masterSafeAddress } = useWallet();
  const { walletBalances } = useBalance();
  const { backupSigner } = useSetup();
  const { goto } = usePageState();

  const [isCreatingSafe, setIsCreatingSafe] = useState(false);

  const masterEaoEthBalance =
    masterEaoAddress && walletBalances?.[masterEaoAddress]?.ETH;

  const isFundedMasterEoa =
    masterEaoEthBalance &&
    masterEaoEthBalance >=
      MIN_ETH_BALANCE_THRESHOLDS[Chain.GNOSIS].safeCreation;

  const status = useMemo(() => {
    if (!isFundedMasterEoa) return SetupEaoFundingStatus.WaitingForEoaFunding;
    if (isCreatingSafe) return SetupEaoFundingStatus.CreatingSafe;
    if (masterSafeAddress) return SetupEaoFundingStatus.Done;
    return SetupEaoFundingStatus.Error;
  }, [isCreatingSafe, isFundedMasterEoa, masterSafeAddress]);

  const statusMessage = useMemo(() => {
    switch (status) {
      case SetupEaoFundingStatus.WaitingForEoaFunding:
        return 'Waiting for transaction';
      case SetupEaoFundingStatus.CreatingSafe:
        return 'Creating account';
      case SetupEaoFundingStatus.Done:
        return 'Account created';
      case SetupEaoFundingStatus.Error:
        return 'Error, please contact support';
    }
  }, [status]);

  useEffect(() => {
    // Create the safe once the master EOA is funded
    if (!isFundedMasterEoa) return;
    if (isCreatingSafe) return;
    setIsCreatingSafe(true);
    message.success('Funds have been received!');
    // TODO: add backup signer
    WalletService.createSafe(Chain.GNOSIS, backupSigner).catch((e) => {
      console.error(e);
      message.error('Failed to create an account. Please try again later.');
    });
  }, [backupSigner, goto, isCreatingSafe, isFundedMasterEoa]);

  useEffect(() => {
    // Only progress is the safe is created and accessible via context (updates on interval)
    if (masterSafeAddress) goto(PageState.Main);
  }, [goto, masterSafeAddress]);

  return (
    <CardFlex>
      <SetupCreateHeader
        prev={SetupScreen.SetupBackupSigner}
        disabled={isCreatingSafe || isIncomplete}
      />
      <Typography.Title level={3}>
        Deposit {MIN_ETH_BALANCE_THRESHOLDS[Chain.GNOSIS].safeCreation} XDAI on
        Gnosis
      </Typography.Title>
      <Typography.Paragraph>
        The app needs these funds to create your account on-chain.
      </Typography.Paragraph>

      <CardSection bordertop="true" borderbottom="true">
        <Typography.Text
          className={loadingStatuses.includes(status) ? 'loading-ellipses' : ''}
        >
          Status: {statusMessage}
        </Typography.Text>
      </CardSection>
      {!isFundedMasterEoa && (
        <SetupEoaFundingWaiting masterEoa={masterEaoAddress} />
      )}
    </CardFlex>
  );
};

const SetupEoaFundingWaiting = ({
  masterEoa,
}: {
  masterEoa: Address | undefined;
}) => {
  return (
    <>
      <CardSection>
        <Alert
          className="card-section-alert"
          type="warning"
          showIcon
          message={
            <Flex vertical gap={5}>
              <Typography.Text strong style={{ color: COLOR.BROWN }}>
                Only send funds on Gnosis Chain!
              </Typography.Text>
              <Typography.Text style={{ color: COLOR.BROWN }}>
                You will lose any assets you send on other chains.
              </Typography.Text>
            </Flex>
          }
        />
      </CardSection>
      <AccountCreationCard>
        <Flex justify="space-between">
          <Typography.Text className="text-sm" type="secondary">
            Account creation address
          </Typography.Text>
          <Flex gap={10} align="center">
            <Tooltip title="Copy to clipboard">
              <CopyOutlined
                style={ICON_STYLE}
                onClick={() =>
                  masterEoa &&
                  copyToClipboard(masterEoa).then(() =>
                    message.success('Address copied!'),
                  )
                }
              />
            </Tooltip>

            {/* {masterEoa && (
                <Popover
                  title="Scan QR code"
                  content={
                    <QRCode
                      size={250}
                      value={`https://metamask.app.link/send/${masterEoa}@${100}`}
                    />
                  }
                >
                  <QrcodeOutlined style={ICON_STYLE}/>
                </Popover>
              )} */}
          </Flex>
        </Flex>

        <span className="can-select-text break-word">
          {`GNO: ${masterEoa}`}
        </span>
        <Alert
          className="account-creation-alert"
          showIcon
          icon={<InfoCircleOutlined />}
          message={
            'After this point, do not send more funds to this address. Once your account is created, you will be given a new address - send further funds there.'
          }
        />
      </AccountCreationCard>
      <Button type="link" target="_blank" href={COW_SWAP_GNOSIS_XDAI_OLAS_URL}>
        Get XDAI on Gnosis Chain {UNICODE_SYMBOLS.EXTERNAL_LINK}
      </Button>
    </>
  );
};

const AccountCreationCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 24px;
  margin-bottom: 24px;
  padding: 16px;
  background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%23A3AEBB' stroke-width='2' stroke-dasharray='6' stroke-dashoffset='15' stroke-linecap='square'/%3e%3c/svg%3e");
  border-radius: 12px;

  .account-creation-alert {
    margin-top: 8px;
    background: #e6f4ff;
    border: 1px solid #91caff;
    color: #002c8c;
    align-items: flex-start;
  }
`;

const ICON_STYLE = { color: '#606F85' };
