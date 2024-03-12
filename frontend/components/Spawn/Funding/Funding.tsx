import { SpawnScreen } from '@/enums';
import { useSpawn } from '@/hooks';
import { Address, FundingRecord, SpawnData } from '@/types';
import { TimelineItemProps, Flex, Typography, Timeline, theme } from 'antd';
import isEmpty from 'lodash/isEmpty';
import {
  useMemo,
  useEffect,
  SetStateAction,
  Dispatch,
  ReactElement,
} from 'react';

type FundRequirementComponentProps = {
  setSpawnData: Dispatch<SetStateAction<SpawnData>>;
  rpc: string;
  address: Address;
  requirement: number;
  contractAddress?: Address;
  symbol: string;
  hasReceivedFunds: boolean;
};

type FundingProps = {
  fundRequirements: FundingRecord;
  FundRequirementComponent: (
    props: FundRequirementComponentProps,
  ) => ReactElement;
  nextPage: SpawnScreen;
  statement: string;
  symbol: string;
  contractAddress?: Address;
};

export const Funding = ({
  fundRequirements,
  FundRequirementComponent,
  nextPage,
  statement,
  symbol,
  contractAddress,
}: FundingProps) => {
  const {
    setSpawnData,
    spawnData: { rpc },
  } = useSpawn();
  const { token } = theme.useToken();

  const timelineItems: TimelineItemProps[] = useMemo(
    () =>
      (Object.keys(fundRequirements) as Address[]).map((address) => {
        const { required, received } = fundRequirements[address];
        return {
          children: (
            <FundRequirementComponent
              setSpawnData={setSpawnData}
              address={address}
              requirement={required}
              symbol={symbol}
              hasReceivedFunds={received}
              contractAddress={contractAddress}
              rpc={rpc}
            />
          ),
          color: received ? token.green : token.red,
        };
      }) as TimelineItemProps[],
    [
      FundRequirementComponent,
      contractAddress,
      fundRequirements,
      rpc,
      setSpawnData,
      symbol,
      token.green,
      token.red,
    ],
  );

  const hasSentAllFunds = useMemo(() => {
    if (isEmpty(fundRequirements)) return false;
    return (Object.keys(fundRequirements) as Address[]).reduce(
      (acc: boolean, address) => acc && fundRequirements[address].received,
      true,
    );
  }, [fundRequirements]);

  // if all funds have been sent, move to next page
  useEffect(() => {
    hasSentAllFunds && setSpawnData((prev) => ({ ...prev, screen: nextPage }));
  }, [hasSentAllFunds, nextPage, setSpawnData]);

  return (
    <>
      <Flex gap={8} vertical>
        <Typography.Text strong>{statement}</Typography.Text>
        <Timeline items={timelineItems} />
      </Flex>
    </>
  );
};
