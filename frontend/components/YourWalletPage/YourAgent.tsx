import { Card, Flex, Skeleton } from 'antd';
import { find, groupBy, isArray, isEmpty, isNil } from 'lodash';
import Image from 'next/image';
import { useMemo } from 'react';
import styled from 'styled-components';

import { OLAS_CONTRACTS } from '@/config/olasContracts';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { ContractType } from '@/enums/Contract';
import { TokenSymbol } from '@/enums/Token';
import {
  useBalanceContext,
  useServiceBalances,
} from '@/hooks/useBalanceContext';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { Address } from '@/types/Address';
import { WalletBalance } from '@/types/Balance';
import { balanceFormat } from '@/utils/numberFormatters';
import { truncateAddress } from '@/utils/truncate';

import { AddressLink } from '../AddressLink';
import { InfoBreakdownList } from '../InfoBreakdown';
import { AgentTitle } from './AgentTitle';
import { Container, infoBreakdownParentStyle } from './styles';
import {
  OlasTitle,
  OwnershipNftTitle,
  ServiceNftIdTitle,
  SignerTitle,
} from './Titles';
import { useYourWallet } from './useYourWallet';
import { WithdrawFunds } from './WithdrawFunds';

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
  return (
    <>
      <YourAgentWalletBreakdown />
      <WithdrawFunds />
    </>
  );
};
