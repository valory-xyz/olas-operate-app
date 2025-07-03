import { CopyOutlined } from '@ant-design/icons';
import { Button, Flex, message, Segmented, Tooltip, Typography } from 'antd';
import Link from 'next/link';
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react';

import { CustomAlert } from '@/components/Alert';
import { SendFundAction } from '@/components/Bridge/types';
import { CHAIN_CONFIG } from '@/config/chains';
import { EvmChainName } from '@/constants/chains';
import { NA, UNICODE_SYMBOLS } from '@/constants/symbols';
import { SWAP_URL_BY_EVM_CHAIN } from '@/constants/urls';
import { Pages } from '@/enums/Pages';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { copyToClipboard } from '@/utils/copyToClipboard';
import { delayInSeconds } from '@/utils/delay';
import { truncateAddress } from '@/utils/truncate';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

const AddFundsWarningAlertSection = () => {
  const { selectedAgentConfig } = useServices();
  const { evmHomeChainId: homeChainId } = selectedAgentConfig;

  return (
    <CardSection>
      <CustomAlert
        type="warning"
        fullWidth
        showIcon
        message={
          <Flex vertical gap={2.5}>
            <Text className="text-base" strong>
              Only send funds on {CHAIN_CONFIG[homeChainId].name} Chain!
            </Text>
            <Text className="text-base">
              You will lose any assets you send on other chains.
            </Text>
          </Flex>
        }
      />
    </CardSection>
  );
};

type AddFundsAddressSectionProps = {
  fundingAddress?: string;
  truncatedFundingAddress?: string;
  handleCopy: () => void;
};

const AddFundsAddressSection = ({
  fundingAddress,
  truncatedFundingAddress,
  handleCopy,
}: AddFundsAddressSectionProps) => (
  <CardSection gap={10} justify="center" align="center" padding="16px 24px">
    <Tooltip
      title={
        <span className="can-select-text flex">
          {fundingAddress ?? 'Unable to load address'}
        </span>
      }
    >
      <Text title={fundingAddress}>{truncatedFundingAddress ?? NA}</Text>
    </Tooltip>

    <Button onClick={handleCopy} icon={<CopyOutlined />} size="large" />
  </CardSection>
);

const AddFundsGetTokensSection = () => {
  const { selectedAgentConfig } = useServices();
  const { evmHomeChainId: homeChainId } = selectedAgentConfig;

  return (
    <CardSection justify="center" bordertop="true" padding="16px 24px">
      <Link target="_blank" href={SWAP_URL_BY_EVM_CHAIN[homeChainId]}>
        Get OLAS + {CHAIN_CONFIG[homeChainId].nativeToken.symbol} on{' '}
        {CHAIN_CONFIG[homeChainId].name} {UNICODE_SYMBOLS.EXTERNAL_LINK}
      </Link>
    </CardSection>
  );
};

/**
 * Add funds section
 */
export const OpenAddFundsSection = forwardRef<HTMLDivElement>((_, ref) => {
  const { selectedAgentConfig } = useServices();
  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const { masterSafes } = useMasterWalletContext();
  const masterSafeAddress = useMemo(
    () =>
      masterSafes?.find((wallet) => wallet.evmChainId === homeChainId)?.address,
    [homeChainId, masterSafes],
  );

  const truncatedFundingAddress: string | undefined = useMemo(
    () => masterSafeAddress && truncateAddress(masterSafeAddress, 4),
    [masterSafeAddress],
  );

  const handleCopyAddress = useCallback(
    () =>
      masterSafeAddress &&
      copyToClipboard(masterSafeAddress).then(() =>
        message.success('Copied successfully!'),
      ),
    [masterSafeAddress],
  );

  return (
    <Flex vertical ref={ref}>
      <AddFundsWarningAlertSection />
      <AddFundsAddressSection
        truncatedFundingAddress={truncatedFundingAddress}
        fundingAddress={masterSafeAddress}
        handleCopy={handleCopyAddress}
      />
      <AddFundsGetTokensSection />
    </Flex>
  );
});
OpenAddFundsSection.displayName = 'OpenAddFundsSection';

const AddFundsBy = forwardRef<HTMLDivElement>((_, ref) => {
  const [isBridgeOnboardingEnabled, isBridgeAddFundsEnabled] = useFeatureFlag([
    'bridge-onboarding',
    'bridge-add-funds',
  ]);
  const { selectedAgentConfig } = useServices();
  const { goto } = usePageState();

  const [fundType, setFundType] = useState<SendFundAction>('transfer');

  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const currentFundingRequirements = CHAIN_CONFIG[homeChainId];

  return (
    <>
      {isBridgeOnboardingEnabled && (
        <CardSection gap={12} $padding="24px" $borderTop>
          <Segmented<SendFundAction>
            options={[
              {
                label: `Send on ${currentFundingRequirements.name}`,
                value: 'transfer',
              },
              { label: 'Bridge from Ethereum', value: 'bridge' },
            ]}
            onChange={setFundType}
            value={fundType}
            block
            className="w-full"
          />
        </CardSection>
      )}

      {fundType === 'bridge' ? (
        <CardSection
          gap={12}
          justify="center"
          align="center"
          $padding="16px 24px"
          $borderTop
          vertical
        >
          <Text className="text-base">
            Bridge funds from Ethereum directly to your Pearl Safe on{' '}
            {EvmChainName[homeChainId]} chain.
          </Text>
          <Tooltip title={isBridgeAddFundsEnabled ? '' : 'Available soon'}>
            <Button
              type="primary"
              size="large"
              block
              onClick={() => goto(Pages.AddFundsToMasterSafeThroughBridge)}
              disabled={!isBridgeAddFundsEnabled}
            >
              Bridge funds
            </Button>
          </Tooltip>
        </CardSection>
      ) : (
        <OpenAddFundsSection ref={ref} />
      )}
    </>
  );
});
AddFundsBy.displayName = 'AddFundsBy';

export const AddFundsSection = () => {
  const fundSectionRef = useRef<HTMLDivElement>(null);
  const [isAddFundsVisible, setIsAddFundsVisible] = useState(false);

  const addFunds = useCallback(async () => {
    setIsAddFundsVisible(true);

    await delayInSeconds(0.1);
    fundSectionRef?.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  const closeAddFunds = useCallback(() => setIsAddFundsVisible(false), []);

  return (
    <>
      <CardSection gap={12} padding="24px">
        <Button
          type="primary"
          size="large"
          ghost
          block
          onClick={isAddFundsVisible ? closeAddFunds : addFunds}
        >
          {isAddFundsVisible ? 'Close instructions' : 'Add funds'}
        </Button>
      </CardSection>

      {isAddFundsVisible && <AddFundsBy ref={fundSectionRef} />}
    </>
  );
};
