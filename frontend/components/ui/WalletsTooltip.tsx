import { Flex, Typography } from 'antd';

import { AddressLink } from '@/components/AddressLink';
import { InfoTooltip } from '@/components/InfoTooltip';
import { COLOR, SupportedMiddlewareChain } from '@/constants';
import { Address, Optional } from '@/types';

const { Text } = Typography;

type WalletType = 'agent' | 'pearl';

type WalletTooltipProps = {
  type: WalletType;
  eoaAddress: Optional<Address>;
  safeAddress: Optional<Address>;
  middlewareHomeChainId: SupportedMiddlewareChain;
};

const TITLES_BY_TYPE: Record<WalletType, string> = {
  agent: 'Agent',
  pearl: 'Pearl',
};

const DESCRIPTIONS_BY_TYPE: Record<WalletType, string> = {
  agent: `Shows the spendable balance held by the agent. Excludes assets the agent has moved into external contracts (e.g. pools).`,
  pearl: `Shows your spendable balance on the selected chain — your deposits plus available staking rewards earned by agents on this chain.`,
};

export const WalletsTooltip = ({
  type,
  eoaAddress,
  safeAddress,
  middlewareHomeChainId,
}: WalletTooltipProps) => {
  return (
    <InfoTooltip
      size="medium"
      styles={{ body: { padding: 16 } }}
      iconSize={18}
      iconColor={COLOR.BLACK}
    >
      <div className="mb-16">{DESCRIPTIONS_BY_TYPE[type]}</div>
      <div className="mb-20">
        {TITLES_BY_TYPE[type]} Wallet consists of two parts:
        <ol>
          <li>
            <Text className="text-sm" strong>
              {TITLES_BY_TYPE[type]} Safe
            </Text>{' '}
            — smart-contract wallet that holds funds.
          </li>
          <li>
            <Text className="text-sm" strong>
              {TITLES_BY_TYPE[type]} Signer
            </Text>{' '}
            — authorizes Safe transactions and keeps a small gas balance.
          </li>
        </ol>
      </div>
      <Flex className="mb-12" justify="space-between">
        <Text className="text-sm" strong>
          {TITLES_BY_TYPE[type]} Safe Address:
        </Text>
        {safeAddress ? (
          <AddressLink
            address={safeAddress}
            middlewareChain={middlewareHomeChainId}
          />
        ) : (
          <Text className="text-sm" type="secondary">
            No {TITLES_BY_TYPE[type]} Safe
          </Text>
        )}
      </Flex>
      <Flex justify="space-between">
        <Text className="text-sm" strong>
          {TITLES_BY_TYPE[type]} Signer Address:
        </Text>
        {eoaAddress ? (
          <AddressLink
            address={eoaAddress}
            middlewareChain={middlewareHomeChainId}
          />
        ) : (
          <Text className="text-sm" type="secondary">
            No {TITLES_BY_TYPE[type]} Signer
          </Text>
        )}
      </Flex>
    </InfoTooltip>
  );
};
