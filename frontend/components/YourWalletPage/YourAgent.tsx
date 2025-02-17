import { Card, Flex, message, Skeleton, Tooltip, Typography } from 'antd';
import { find, groupBy, isArray, isEmpty, isNil } from 'lodash';
import Image from 'next/image';
import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { MiddlewareChain, MiddlewareDeploymentStatus } from '@/client';
import { OLAS_CONTRACTS } from '@/config/olasContracts';
import { NA, UNICODE_SYMBOLS } from '@/constants/symbols';
import { BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { useAgentUi } from '@/context/AgentUiProvider';
import { AgentType } from '@/enums/Agent';
import { ContractType } from '@/enums/Contract';
import { TokenSymbol } from '@/enums/Token';
import {
  useBalanceContext,
  useServiceBalances,
} from '@/hooks/useBalanceContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { Address } from '@/types/Address';
import { WalletBalance } from '@/types/Balance';
import { generateName } from '@/utils/agentName';
import { balanceFormat } from '@/utils/numberFormatters';
import { truncateAddress } from '@/utils/truncate';

import { AddressLink } from '../AddressLink';
import { InfoBreakdownList } from '../InfoBreakdown';
import { Container, infoBreakdownParentStyle } from './styles';
import {
  OlasTitle,
  OwnershipNftTitle,
  ServiceNftIdTitle,
  SignerTitle,
} from './Titles';
import { useYourWallet } from './useYourWallet';
import { WithdrawFunds } from './WithdrawFunds';

const { Text, Paragraph } = Typography;

const NftCard = styled(Card)`
  .ant-card-body {
    padding: 0;
    img {
      border-radius: 8px;
    }
  }
`;

const SafeAddress = ({ address }: { address: Address }) => {
  const { middlewareChain } = useYourWallet();

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: 'Wallet Address',
            leftClassName: 'text-light text-sm',
            right: (
              <AddressLink
                address={address}
                middlewareChain={middlewareChain}
              />
            ),
            rightClassName: 'font-normal text-sm',
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

const ExternalAgentProfileLink = ({ href }: { href: string }) => {
  return (
    <a href={href} target="_blank" className="text-sm">
      Agent profile {UNICODE_SYMBOLS.EXTERNAL_LINK}
    </a>
  );
};

const AgentUiBrowserLink = ({ onClick }: { onClick: () => void }) => {
  return (
    <a onClick={onClick} className="text-sm" href="#">
      Agent profile {UNICODE_SYMBOLS.EXTERNAL_LINK}
    </a>
  );
};

const AgentTitle = ({ address }: { address: Address }) => {
  const { middlewareChain } = useYourWallet();
  const { selectedAgentType, selectedService } = useServices();
  const { service, deploymentStatus } = useService(
    selectedService?.service_config_id,
  );

  const { goto, show } = useAgentUi();

  const handleAgentUiBrowserLinkClick = useCallback(async () => {
    if ([goto || show].some((fn) => !fn)) {
      message.error('Agent UI browser IPC methods are not available');
      return;
    }

    if (deploymentStatus !== MiddlewareDeploymentStatus.DEPLOYED) {
      message.error(
        'Please run the agent first, before attempting to view the agent UI',
      );
      return;
    }
    goto?.('http://localhost:8716')?.then(show);
  }, [deploymentStatus, goto, show]);

  const agentProfileLink = useMemo(() => {
    if (!address) return null;

    // gnosis predict trader
    if (
      middlewareChain === MiddlewareChain.GNOSIS &&
      selectedAgentType === AgentType.PredictTrader
    ) {
      return (
        <ExternalAgentProfileLink
          href={`https://predict.olas.network/agents/${address}`}
        />
      );
    }

    // base memeooorr
    if (
      middlewareChain === MiddlewareChain.BASE &&
      selectedAgentType === AgentType.Memeooorr &&
      service?.env_variables?.TWIKIT_USERNAME?.value
    )
      return `https://www.agents.fun/services/${service.env_variables.TWIKIT_USERNAME.value ?? '#'}`;

    // modius
    if (
      middlewareChain === MiddlewareChain.MODE &&
      selectedAgentType === AgentType.Modius
    )
      return <AgentUiBrowserLink onClick={handleAgentUiBrowserLinkClick} />;

    return null;
  }, [
    address,
    handleAgentUiBrowserLinkClick,
    middlewareChain,
    selectedAgentType,
    service?.env_variables?.TWIKIT_USERNAME?.value,
  ]);

  return (
    <Flex vertical gap={12}>
      <Flex gap={12}>
        <Image
          width={36}
          height={36}
          alt="Agent wallet"
          src="/agent-wallet.png"
        />

        <Flex vertical className="w-full">
          <Text className="m-0 text-sm" type="secondary">
            Your agent
          </Text>
          <Flex justify="space-between">
            <Tooltip
              arrow={false}
              title={
                <Paragraph className="text-sm m-0">
                  This is your agent&apos;s unique name
                </Paragraph>
              }
              placement="top"
            >
              <Text strong>{address ? generateName(address) : NA}</Text>
            </Tooltip>

            {agentProfileLink}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};

type ServiceAndNftDetailsProps = { serviceNftTokenId: number };
const ServiceAndNftDetails = ({
  serviceNftTokenId,
}: ServiceAndNftDetailsProps) => {
  const { middlewareChain, evmHomeChainId } = useYourWallet();

  const serviceRegistryL2ContractAddress =
    OLAS_CONTRACTS[evmHomeChainId][ContractType.ServiceRegistryL2].address;

  return (
    <NftCard>
      <Flex>
        <Flex>
          <Image width={78} height={78} alt="NFT" src="/NFT.png" />
        </Flex>
        <Flex
          style={{ padding: '16px 12px' }}
          align="center"
          justify="space-between"
          flex={1}
        >
          <Flex vertical>
            <OwnershipNftTitle />
            <a
              href={`${BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN[middlewareChain]}/token/${serviceRegistryL2ContractAddress}/instance/${serviceNftTokenId}`}
              target="_blank"
            >
              {truncateAddress(serviceRegistryL2ContractAddress as Address)}{' '}
              {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
          </Flex>

          <Flex vertical>
            <ServiceNftIdTitle />
            <a
              href={`https://registry.olas.network/${middlewareChain}/services/${serviceNftTokenId}`}
              target="_blank"
            >
              {serviceNftTokenId} {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
          </Flex>
        </Flex>
      </Flex>
    </NftCard>
  );
};

const YourAgentWalletBreakdown = () => {
  const { isLoaded } = useBalanceContext();
  const { selectedService } = useServices();
  const { serviceNftTokenId, serviceEoa } = useService(
    selectedService?.service_config_id,
  );
  const { serviceSafeBalances, serviceEoaBalances } = useServiceBalances(
    selectedService?.service_config_id,
  );
  const { serviceSafe, middlewareChain, evmHomeChainId } = useYourWallet();

  const {
    availableRewardsForEpochEth,
    isEligibleForRewards,
    accruedServiceStakingRewards,
  } = useRewardContext();

  const reward = useMemo(() => {
    if (!isLoaded) return <Skeleton.Input size="small" active />;
    if (isEligibleForRewards) {
      return `~${balanceFormat(availableRewardsForEpochEth, 2)} OLAS`;
    }

    return 'Not yet earned';
  }, [isLoaded, isEligibleForRewards, availableRewardsForEpochEth]);

  const serviceSafeOlas = useMemo(
    () =>
      serviceSafeBalances?.find(
        ({ symbol, evmChainId }) =>
          symbol === TokenSymbol.OLAS && evmChainId === evmHomeChainId,
      ),
    [serviceSafeBalances, evmHomeChainId],
  );

  const serviceSafeRewards = useMemo(
    () => [
      {
        title: 'Claimed rewards',
        value: `${balanceFormat(serviceSafeOlas?.balance ?? 0, 2)} OLAS`,
      },
      {
        title: 'Unclaimed rewards',
        value: `${balanceFormat(accruedServiceStakingRewards, 2)} OLAS`,
      },
      {
        title: 'Current epoch rewards',
        value: reward,
      },
    ],
    [accruedServiceStakingRewards, reward, serviceSafeOlas],
  );

  const serviceSafeNativeBalances = useMemo(() => {
    if (!serviceSafeBalances) return null;

    const nativeBalances = serviceSafeBalances.filter(
      ({ evmChainId }) => evmChainId === evmHomeChainId,
    );

    /**
     * Native balances with wrapped token balances
     * @example { xDai: 100, Wrapped xDai: 50 } => { xDai: 150 }
     */
    const groupedNativeBalances = Object.entries(
      groupBy(nativeBalances, 'walletAddress'),
    ).map(([address, items]) => {
      const nativeTokenBalance = find(items, { isNative: true })?.balance || 0;
      const wrappedBalance =
        find(items, { isWrappedToken: true })?.balance || 0;
      const totalBalance = nativeTokenBalance + wrappedBalance;

      return {
        ...items[0],
        walletAddress: address,
        balance: totalBalance,
      } as WalletBalance;
    });

    return groupedNativeBalances;
  }, [serviceSafeBalances, evmHomeChainId]);

  const serviceSafeErc20Balances = useMemo(
    () =>
      serviceSafeBalances?.filter(
        ({ isNative, symbol, evmChainId, isWrappedToken }) =>
          !isNative &&
          symbol !== TokenSymbol.OLAS &&
          !isWrappedToken &&
          evmChainId === evmHomeChainId,
      ),
    [serviceSafeBalances, evmHomeChainId],
  );

  const serviceEoaNativeBalance = useMemo(
    () =>
      serviceEoaBalances?.find(
        ({ isNative, evmChainId }) => isNative && evmChainId === evmHomeChainId,
      ),
    [serviceEoaBalances, evmHomeChainId],
  );

  if (!serviceSafe) return null;

  return (
    <Card title={<AgentTitle address={serviceSafe.address} />}>
      <Container>
        <SafeAddress address={serviceSafe.address} />

        {!isEmpty(serviceSafeRewards) && (
          <Flex vertical gap={8}>
            <OlasTitle />
            <InfoBreakdownList
              list={serviceSafeRewards.map((item) => ({
                left: item.title,
                leftClassName: 'text-light text-sm',
                right: item.value,
              }))}
              parentStyle={infoBreakdownParentStyle}
            />
          </Flex>
        )}

        {(!isNil(serviceSafeNativeBalances) ||
          !isNil(serviceEoaNativeBalance)) && (
          <Flex vertical gap={8}>
            {isArray(serviceSafeNativeBalances) && (
              <InfoBreakdownList
                list={serviceSafeNativeBalances.map(({ balance, symbol }) => ({
                  left: <strong>{symbol}</strong>,
                  leftClassName: 'text-sm',
                  right: `${balanceFormat(balance, 4)} ${symbol}`,
                }))}
                parentStyle={infoBreakdownParentStyle}
              />
            )}
            {isArray(serviceSafeErc20Balances) && (
              <InfoBreakdownList
                list={serviceSafeErc20Balances.map(({ balance, symbol }) => ({
                  left: <strong>{symbol}</strong>,
                  leftClassName: 'text-sm',
                  right: `${balanceFormat(balance, 4)} ${symbol}`,
                }))}
                parentStyle={infoBreakdownParentStyle}
              />
            )}
            {!isNil(serviceEoa) && (
              <InfoBreakdownList
                list={[
                  {
                    left: serviceEoa.address && middlewareChain && (
                      <SignerTitle
                        signerAddress={serviceEoa.address}
                        middlewareChain={middlewareChain}
                      />
                    ),
                    leftClassName: 'text-sm',
                    right: `${balanceFormat(serviceEoaNativeBalance?.balance, 4)} ${serviceEoaNativeBalance?.symbol}`,
                  },
                ]}
                parentStyle={infoBreakdownParentStyle}
              />
            )}
          </Flex>
        )}

        {!isNil(serviceNftTokenId) && (
          <ServiceAndNftDetails serviceNftTokenId={serviceNftTokenId} />
        )}
      </Container>
    </Card>
  );
};

export const YourAgentWallet = () => {
  const isWithdrawFundsEnabled = useFeatureFlag('withdraw-funds');

  return (
    <>
      <YourAgentWalletBreakdown />
      {isWithdrawFundsEnabled && <WithdrawFunds />}
    </>
  );
};
