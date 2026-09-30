import { Flex, Typography } from 'antd';

import { MiddlewareChain } from '@/constants';
import { Address } from '@/types/Address';

import {
  OTHER_TOKEN,
  SELECT_TOKEN_FOOTER,
  SELECT_TOKEN_LABEL,
} from './constants';
import { CardRow, OptionButton } from './styles';
import { getTokenImage, getTokenMeta } from './utils';

const { Text } = Typography;

type SelectSourceTokenProps = {
  chain: MiddlewareChain;
  tokens: Address[];
  /** Why the tokens cannot be picked; set, it disables them. */
  disabledReason?: string;
  onSelect: (token: Address) => void;
  onOther: () => void;
};

export const SelectSourceToken = ({
  chain,
  tokens,
  disabledReason,
  onSelect,
  onOther,
}: SelectSourceTokenProps) => (
  <>
    <CardRow vertical gap={12}>
      <Text>{SELECT_TOKEN_LABEL}</Text>
      {disabledReason && (
        <Text className="text-neutral-tertiary">{disabledReason}</Text>
      )}
      <Flex gap={8} wrap>
        {tokens.map((token) => {
          const symbol = getTokenMeta(chain, token)?.symbol ?? token;
          return (
            <OptionButton
              key={token}
              icon={getTokenImage(symbol)}
              label={symbol}
              disabled={!!disabledReason}
              onClick={() => onSelect(token)}
            />
          );
        })}
        <OptionButton
          label={OTHER_TOKEN}
          disabled={!!disabledReason}
          onClick={onOther}
        />
      </Flex>
    </CardRow>
    <CardRow justify="center">
      <Text className="text-neutral-tertiary">{SELECT_TOKEN_FOOTER}</Text>
    </CardRow>
  </>
);
