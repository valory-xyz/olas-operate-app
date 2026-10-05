import { Button, Flex, Skeleton, Typography } from 'antd';

import { MiddlewareChain } from '@/constants';
import { FundingRunSources } from '@/types/FundingRun';

import {
  OTHER_CHAIN,
  SELECT_CHAIN_FOOTER,
  SELECT_CHAIN_LABEL,
} from './constants';
import { CardRow, OptionButton } from './styles';
import { getChainImage, getChainName } from './utils';

const { Text } = Typography;

type SelectSourceChainProps = {
  sources?: FundingRunSources;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelect: (chain: MiddlewareChain) => void;
  onOther: () => void;
};

export const SelectSourceChain = ({
  sources,
  isLoading,
  isError,
  onRetry,
  onSelect,
  onOther,
}: SelectSourceChainProps) => (
  <>
    <CardRow vertical gap={12}>
      <Text>{SELECT_CHAIN_LABEL}</Text>
      {isLoading && <Skeleton.Input active block />}
      {isError && (
        <Flex gap={8} align="center">
          <Text type="danger">Couldn&apos;t load the chains.</Text>
          <Button size="small" onClick={onRetry}>
            Retry
          </Button>
        </Flex>
      )}
      {sources && (
        <Flex gap={8} wrap>
          {(Object.keys(sources) as MiddlewareChain[]).map((chain) => (
            <OptionButton
              key={chain}
              icon={getChainImage(chain)}
              label={getChainName(chain)}
              onClick={() => onSelect(chain)}
            />
          ))}
          <OptionButton label={OTHER_CHAIN} onClick={onOther} />
        </Flex>
      )}
    </CardRow>
    <CardRow justify="center">
      <Text className="text-neutral-tertiary">{SELECT_CHAIN_FOOTER}</Text>
    </CardRow>
  </>
);
